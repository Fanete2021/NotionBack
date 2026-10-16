# Grafana для Notion

Один приёмник на сервере, где крутится бэкенд. VictoriaMetrics хранит метрики хоста 14 дней, Loki хранит логи 7 дней, Grafana их показывает. Сбор делает `alloy`.

Grafana не встраивается во фронт. Это отдельный сайт `https://grafana.notiontv.ru`. В ту же Grafana попадают stdout контейнеров `notionback-api` и `notionfront`. Браузерные `console.log` туда не доходят: в Docker виден только stdout процесса Next.js.

Схема такая же, как в htmlgamecontainer: сначала `grafana-stack`, потом `alloy`. Порты Loki и VictoriaMetrics на хост не публикуются. Grafana слушает `127.0.0.1:13080`, снаружи её открывает nginx.

Деплой приложения этот стек не поднимает. Его ставят на сервере один раз и дальше он живёт сам. Пересоздание `notionback-api` или `notionfront` Alloy подхватывает по docker socket.

## Что где

| Путь | Что |
|---|---|
| `grafana-stack/docker-compose.yml` | VictoriaMetrics, Loki, Grafana, сеть `notion-obs` |
| `grafana-stack/docker-compose.ingest.yml` | только если Alloy стоит на другой машине: открывает `:3100` и `:8428` |
| `grafana-stack/.env` | пароль администратора Grafana |
| `alloy/docker-compose.yml` | агент на той же машине, что и Grafana |
| `alloy/docker-compose.remote.yml` | агент на машине без сети `notion-obs` |
| `alloy/config/logger.alloy` | stdout `notionback-api` и `notionfront` → Loki |
| `alloy/config/node-exporter.alloy` | CPU, память, диск, сеть → VictoriaMetrics |
| `nginx/grafana.notiontv.ru.conf` | reverse proxy на `127.0.0.1:13080` |

В Grafana после старта четыре дашборда. `logs` / Notion logs и `node` / Node Exporter Lite — сырые логи и хост. Папка `product`: «Активность» и «API». Они считают события из JSON-логов `notionback-api` (поле `action` и access-лог pino), это не отдельные метрики VictoriaMetrics. Grafana подхватывает новые JSON из `grafana/dashboards` сама, примерно за 30 секунд, контейнер перезапускать не нужно. На сервере эти файлы должны лежать в том же каталоге, откуда поднят стек.

## 1. DNS

A-запись `grafana.notiontv.ru` должна указывать на IP сервера, где будет nginx и Grafana. Пока запись не резолвится в этот IP, сертификат не выпустят.

Проверка с ноутбука:

```bash
dig +short grafana.notiontv.ru
```

## 2. Код на сервере

Каталог `metrics/` должен оказаться на сервере рядом с остальным бэкендом. Если там git-клон репозитория:

```bash
cd /home/deploy/back
git pull
```

CI само по себе файлы стека на сервер не копирует: workflow только запускает `deploy.sh` и обновляет образ API.

На этой же машине контейнер фронта должен называться `notionfront`. Это имя задано в `NotionFront/docker-compose.prod.yml`. После выката этого изменения на сервер фронта:

```bash
cd /home/deploy/front
# подтянуть compose с container_name: notionfront, затем
docker compose -f docker-compose.prod.yml up -d
docker ps --format '{{.Names}}' | grep -E 'notionback-api|notionfront'
```

Оба имени должны быть в списке. Alloy читает только их.

## 3. Поднять Grafana

На сервере бэкенда:

```bash
cd /home/deploy/back/metrics/grafana-stack
cp .env.example .env
chmod 600 .env
```

В `.env` вписать длинный пароль:

```env
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=поменять
```

Пароль применяется только при пустой базе Grafana. Если `grafana/data` уже есть, смена `.env` логин не меняет.

```bash
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:13080/api/health
```

Ответ health — `ok` или JSON со статусом. Дальше снаружи сайта ещё нет: слушает только localhost.

## 4. Поднять Alloy на этой же машине

```bash
cd /home/deploy/back/metrics/alloy
cp .env.example .env
chmod 600 .env
```

`PT_HOST` — короткое имя машины:

```bash
hostname -s
```

`.env`:

```env
EXTRA_LOGS_DIR=/var/log
LOKI_URL=http://loki:3100/loki/api/v1/push
METRICS_URL=http://victoria-metrics:8428/api/v1/write
PT_ENV=prod
PT_HOST=имя-из-hostname
PT_TZ=Europe/Moscow
```

```bash
docker compose up -d
docker logs notion-alloy --tail 40
```

В логах агента не должно быть ошибок записи в Loki или VictoriaMetrics. Через одну-две минуты в Grafana в дашборде Node Exporter Lite появляется этот `PT_HOST`, а в Notion logs — строки `{service="notionback-api"}`.

Прод-бэкенд пишет JSON pino. Alloy ставит лейбл `level`: `info`, `warn`, `error`, `fatal`, `debug`, `trace`. Строки фронта без такого JSON получают `level=raw`.

После правки любого `*.alloy` агент надо перезапустить: конфиг сам не перечитывается.

```bash
docker compose restart
```

## 5. nginx и сертификат

Нужны nginx и плагин certbot. На Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo mkdir -p /var/www/html
```

Порты 80 и 443 должны быть открыты. Порты `13080`, `3100`, `8428` наружу не открывать: на приёмниках нет пароля, Grafana и так доступна только через nginx.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Если ufw ещё не использовался, перед `enable` проверь, что правило SSH уже есть. Иначе можно закрыть себе вход.

Поставить сайт. Путь поправь, если репозиторий лежит не в `/home/deploy/back`:

```bash
sudo cp /home/deploy/back/metrics/nginx/grafana.notiontv.ru.conf \
  /etc/nginx/sites-available/grafana.notiontv.ru
sudo ln -sfn /etc/nginx/sites-available/grafana.notiontv.ru \
  /etc/nginx/sites-enabled/grafana.notiontv.ru
sudo nginx -t
sudo systemctl reload nginx
```

Выпустить сертификат. Плагин сам допишет `listen 443 ssl` и редирект с 80 на 443. Заголовки прокси и websocket в `location /` он оставляет.

```bash
sudo certbot --nginx -d grafana.notiontv.ru
```

Проверка продления:

```bash
sudo certbot renew --dry-run
```

Таймер certbot на Ubuntu ставится вместе с пакетом (`systemctl list-timers | grep certbot`).

Открыть `https://grafana.notiontv.ru`. Логин — `admin` и пароль из `metrics/grafana-stack/.env`. Регистрация выключена.

Кука сессии помечена Secure, поэтому логин рассчитан на https-домен, не на `http://127.0.0.1:13080`.

## 6. Фронт на том же сервере

Отдельная Grafana для фронта не нужна. Контейнер `notionfront` на той же машине виден тому же Alloy через docker socket. В дашборде Notion logs в переменной «Сервис» выбирается `notionfront`.

Клиентский код Next.js в браузере в Loki не попадает. Туда идут сообщения серверного процесса контейнера.

## 7. Фронт на другом сервере

Так делать только если API и фронт реально на разных машинах.

На сервере Grafana опубликовать приёмники:

```bash
cd /home/deploy/back/metrics/grafana-stack
docker compose -f docker-compose.yml -f docker-compose.ingest.yml up -d
```

Файрвол: 3100 и 8428 только с IP сервера фронта, не из интернета.

```bash
sudo ufw allow from <IP-фронта> to any port 3100 proto tcp
sudo ufw allow from <IP-фронта> to any port 8428 proto tcp
```

На сервер фронта скопировать каталог `metrics/alloy` (без `.env` с первой машины).

```bash
cd /home/deploy/front/metrics/alloy
cp .env.remote.example .env
chmod 600 .env
```

В `.env` подставить IP сервера Grafana и `hostname -s` этой машины:

```env
LOKI_URL=http://<IP-grafana>:3100/loki/api/v1/push
METRICS_URL=http://<IP-grafana>:8428/api/v1/write
PT_ENV=prod
PT_HOST=имя-фронт-сервера
PT_TZ=Europe/Moscow
```

```bash
docker compose -f docker-compose.remote.yml up -d
```

Контейнер фронта здесь тоже должен называться `notionfront`. В Grafana хост появится отдельным значением `PT_HOST` и в логах, и в Node Exporter Lite.

## Проверка

```bash
curl -fsS http://127.0.0.1:13080/api/health
docker ps --format '{{.Names}}' | grep notion
```

В Grafana → Explore → Loki:

```logql
{service="notionback-api"}
{service="notionfront"}
{service="notionback-api", level="error"}
```

Explore → prometheus:

```promql
node_uname_info{job="node"}
```

Пустой ответ в первую минуту нормален: scrape метрик раз в 60 секунд, логи появятся после следующей строки stdout контейнера.
