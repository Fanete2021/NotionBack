## Часть 1. MVP

### 1.0 Коротко: как это работает по шагам

1. Пишешь код, коммитишь, `git push` (или мёржишь PR) в `main`.
2. GitHub видит пуш и запускает workflow `docker-build.yml` — это и есть GitHub Actions.
3. Workflow внутри себя собирает Docker-образ по `Dockerfile`.
4. Собранный образ пушится в `ghcr.io` — приватный Docker-registry, встроенный в GitHub, привязанный к репозиторию.
5. Смотришь **Repo → Actions** — зелёная галочка значит, что шаги 2–4 прошли успешно.
6. Смотришь **Repo → Packages** — там появляется сам образ, с тегами.
7. Руками (без CI) заходишь на сервер, логинишься в `ghcr.io`, стягиваешь образ (`docker pull`) и запускаешь (`docker run --env-file .env`) — чтобы своими глазами увидеть, что всё реально работает от начала до конца.

Дальше в этом разделе — то же самое, но подробно, файл за файлом.

### 1.1 Что Нужно 

- `Dockerfile` — мультистейдж сборка, в финальном образе только `dist` + прод-зависимости.
- `.github/workflows/docker-build.yml` — при пуше в `main` собирает образ и пушит в `ghcr.io`.

### Что такое workflow

**Workflow** — это YAML-файл в папке `.github/workflows/`. GitHub сам подхватывает такие файлы и запускает их автоматически при событии, указанном в блоке `on:` (пуш в ветку, ручной запуск через кнопку, расписание по cron и т.д.). Workflow состоит из **jobs** (задач), а каждая job — из **steps** (шагов), которые выполняются по порядку на чистой виртуалке GitHub (`runs-on: ubuntu-latest`).

В этом проекте (MVP + референс из Части 2) таких файлов три:

|Файл|Когда запускается|Что делает|
|---|---|---|
|`docker-build.yml` (MVP, ниже)|пуш в `main`|собирает Docker-образ и пушит в `ghcr.io`|
|`deploy.yml` (Часть 2)|пуш в `main` или вручную|то же самое + по SSH заходит на сервер и деплоит|
|`cleanup-packages.yml` (Часть 2)|по расписанию или вручную|удаляет старые версии образа в `ghcr.io`|

## `.github/workflows/docker-build.yml`:

### Пример docker-build.yml:
Файл для описания процессов гиту.
Советую посмотреть поразбираться, если интересно.

**Это пример, его нужно править под наш проект!**

```yaml

name: Build and push Docker image

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build:
    name: Build & push image
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: vars
        run: |
          # ghcr требует имя образа в нижнем регистре, а owner/repo может быть с заглавными
          echo "image=ghcr.io/${GITHUB_REPOSITORY,,}" >> "$GITHUB_OUTPUT"
          echo "tag=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ steps.vars.outputs.image }}:${{ steps.vars.outputs.tag }}
            ${{ steps.vars.outputs.image }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 1.3 Смотрим сборку

**Repo → Actions** — после пуша появится запуск `Build and push Docker image`. Зелёная галочка —
собралось и запушилось.

Красный крестик — открой лог шага. Частые причины: опечатка в имени секрета, отступы в YAML
(там всё завязано на пробелы), или забытый блок `permissions`.

### 1.4 Проверяем образ в Packages

**Repo → Packages** (или **profile → Packages**) — появится пакет `githubactionsservercicd`,
тип Container. Приватный по умолчанию, наследует видимость репозитория.

Тегов два: `latest` и короткий sha коммита (`${GITHUB_SHA::7}`) — это на будущее, для отката на
конкретную версию.

## Часть 2. Прод 

Когда healthcheck для `docker-compose.prod.yml` на
сервере, автодеплой по SSH из Actions, откаты, чистка старых образов. 

```
push / merge PR в main
      │
      ▼
GitHub Actions: build → docker образ → ghcr.io
      │
      ▼
GitHub Actions: deploy → ssh на сервер → deploy.sh → docker compose pull + up
```

### Какие файлы где должны лежать

Часть файлов из репозитория реально нужна и на сервере — их туда копируют вручную (не через git). Остальное — только для CI, на сервер это никогда не попадает.

**На сервере, в `/home/deploy/back` (см. 2.2.3):**
- `docker-compose.prod.yml` — какие контейнеры поднимать
- `deploy.sh` — скрипт, который вызывает `deploy.yml` по SSH
- `.env` — секреты и конфиг сервера; создаётся **только на сервере**, в git не попадает никогда (см. `.gitignore`)

**Только в репозитории / выполняется в CI, на сервер не копируется:**
- `Dockerfile` — нужен только на этапе сборки образа внутри Actions
- `.github/workflows/*.yml` — выполняются на виртуалках GitHub, не на твоём сервере

### 2.1 Файлы в репозитории бэка

#### 2.1.1 `Dockerfile` (расширенная версия)

Отличия от MVP-версии из 1.1: `HUSKY=0` (в контейнере нет `.git`, husky в `prepare`-скрипте
уронит `npm ci`), опциональные строки под Prisma, `LABEL` для привязки пакета к репозиторию,
`curl`/`openssl` для healthcheck и Prisma на alpine.

**Это пример** — копируй не один в один, а адаптируй под свой стек (свой набор зависимостей, есть ли у тебя вообще Prisma и т.д.).

```dockerfile
# ---------- deps (все зависимости, включая dev) ----------
FROM node:22-alpine AS deps
WORKDIR /app
# HUSKY=0 обязателен: в контейнере нет .git, и husky в prepare-скрипте уронит npm ci
ENV HUSKY=0
COPY package*.json ./
# если Prisma — раскомментируй, схема нужна для postinstall
# COPY prisma ./prisma
RUN npm ci

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
ENV HUSKY=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- prod deps (без dev) ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
ENV HUSKY=0
COPY package*.json ./
# COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

# Привязывает пакет в ghcr к репозиторию — без этого пакет "висит" отдельно
# и правами на него неудобно управлять. Подставь свой owner/repo.
LABEL org.opencontainers.image.source="https://github.com/OWNER/REPO"

ENV NODE_ENV=production
ENV PORT=3000
# curl нужен для healthcheck; openssl — для Prisma на alpine
RUN apk add --no-cache curl openssl

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
# COPY --from=build /app/prisma ./prisma

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Про Prisma:** в `prisma/schema.prisma` добавь бинарные таргеты для alpine, иначе клиент не запустится:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

#### 2.1.2 Healthcheck-эндпоинт

Нужен, чтобы compose понимал, поднялось приложение или нет.

```bash
npm i @nestjs/terminus
```

**Пример базовой проверки** — ниже она пустая (`check([])`, просто «процесс жив»). Когда подключишь БД/Redis, добавляй туда соответствующие индикаторы (`.pingCheck(...)` и т.п.) — под свой стек, это не копипаста один в один.

```ts
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
```

#### 2.1.3 `docker-compose.prod.yml`

**Нужен отдельный для сервера!**

Лежит в репозитории, но **исполняется на сервере**.

У `postgres` и `redis` **нет** секции `ports` — они недоступны снаружи вообще. Приложение ходит к ним по именам сервисов: `postgres:5432`, `redis:6379`.

#### 2.1.4 `deploy.sh`

**Что это и зачем.** Обычный bash-скрипт, который выполняется **на сервере**, а не в GitHub Actions. Workflow `deploy.yml` просто заходит по SSH и запускает его — вся логика самого деплоя (что обновить, в каком порядке, что делать при ошибке) живёт здесь, а не размазана по YAML. Плюс его можно запустить руками прямо на сервере для отладки, не гоняя весь CI заново.

Лежит в репозитории, копируется на сервер (см. 2.2.3 «Каталог проекта»).

**Это пример** — адаптируй под свой стек. Например, сейчас шаг миграций закомментирован, потому что в приложении ещё нет ORM/схемы.

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

TAG="${1:?usage: ./deploy.sh <image-tag>}"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Deploying tag: $TAG"

# запоминаем текущий тег для отката
if grep -q '^IMAGE_TAG=' .env; then
  grep '^IMAGE_TAG=' .env | sed 's/^IMAGE_TAG=/PREV_IMAGE_TAG=/' > .image-prev
  sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=${TAG}|" .env
else
  echo "IMAGE_TAG=${TAG}" >> .env
fi

echo "==> Pull image"
$COMPOSE pull api

echo "==> Ensure postgres & redis are up"
$COMPOSE up -d postgres redis

echo "==> Run migrations"
# У приложения пока нет ORM/схемы — мигрировать нечего, шаг пропущен.
# Когда подключишь Prisma/TypeORM, верни сюда одну из строк:
# $COMPOSE run --rm --no-deps api npx prisma migrate deploy
# $COMPOSE run --rm --no-deps api npm run migration:run

echo "==> Restart api"
$COMPOSE up -d --no-deps api

echo "==> Cleanup"
docker image prune -f

$COMPOSE ps
echo "==> Done"
```

`set -euo pipefail` важен: если миграция упадёт, скрипт остановится и **не подменит рабочий контейнер сломанной версией**. Workflow покраснеет, старый api продолжит работать.

#### 2.1.5 `.github/workflows/deploy.yml`

Отличие от MVP-workflow из 1.1: добавлен второй job `deploy`, который по SSH заходит на сервер и
вызывает `deploy.sh`. Плюс `workflow_dispatch` с параметром `tag` — механизм отката.

**Это пример** — не копируй вслепую: адрес в `environment.url`, имена секретов и сам сценарий деплоя подгони под свой проект.

```yaml
name: Deploy backend

on:
  push:
    branches: [main]
  # ручной перезапуск и откат на произвольный тег
  workflow_dispatch:
    inputs:
      tag:
        description: 'Тег образа для деплоя (пусто = собрать текущий main)'
        required: false
        type: string

# не даём двум деплоям идти одновременно
concurrency:
  group: deploy-backend-production
  cancel-in-progress: false

jobs:
  build:
    name: Build & push image
    runs-on: ubuntu-latest
    # без этого GITHUB_TOKEN не сможет пушить в ghcr
    permissions:
      contents: read
      packages: write
    outputs:
      image: ${{ steps.vars.outputs.image }}
      tag: ${{ steps.vars.outputs.tag }}
    steps:
      - uses: actions/checkout@v4

      - id: vars
        run: |
          # ghcr требует имя образа в нижнем регистре, а owner/repo может быть с заглавными
          echo "image=ghcr.io/${GITHUB_REPOSITORY,,}" >> "$GITHUB_OUTPUT"
          echo "tag=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ steps.vars.outputs.image }}:${{ steps.vars.outputs.tag }}
            ${{ steps.vars.outputs.image }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to server
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.example.com
    steps:
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh && chmod 700 ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          echo "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          chmod 644 ~/.ssh/known_hosts

      - name: Deploy
        env:
          TAG: ${{ inputs.tag || needs.build.outputs.tag }}
        run: |
          ssh "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" \
            "cd ${{ secrets.DEPLOY_PATH }} && ./deploy.sh $TAG"
```

Несколько моментов:

- **`on: push: branches: [main]`** покрывает и прямой пуш, и мерж PR — мерж создаёт коммит в `main`, workflow стартует сам. Отдельного триггера на PR не нужно.
- **`cache-from/cache-to: type=gha`** — кеш слоёв в хранилище Actions. Вторая и последующие сборки идут в разы быстрее, `npm ci` переиспользуется, пока не менялся `package-lock.json`.
- **`workflow_dispatch` с `tag`** — это и есть механизм отката: **Actions → Deploy backend → Run workflow** и вписываешь старый short-sha. `build` при этом соберёт заново, но `deploy` возьмёт указанный тег.
- **`environment: production`** даёт вкладку Deployments в репозитории и позволяет позже навесить ручное подтверждение (Settings → Environments → Required reviewers).

---

### 2.2 Подготовка сервера

#### 2.2.3 Каталог проекта

Работаем в домашней директории пользователя `deploy` — `/home/deploy/`. Сам проект живёт в `/home/deploy/back` (это и есть `~/back` в командах ниже, раз выполняем их от имени `deploy`).

Скопируй туда `docker-compose.prod.yml` и `deploy.sh` из репозитория (через `scp` с локальной машины или `nano` + вставка):

```bash
chmod +x ~/back/deploy.sh
```

#### 2.2.5 `.env` на сервере

Создай `.env`.

```bash
nano ~/back/.env
```

ПРИМЕР

```env
# --- образ (owner/repo в НИЖНЕМ регистре) ---
REGISTRY_IMAGE=ghcr.io/owner/repo
IMAGE_TAG=latest

# --- postgres ---
POSTGRES_USER=app
POSTGRES_PASSWORD=<длинный_рандом>
POSTGRES_DB=app

# --- redis ---
REDIS_PASSWORD=<длинный_рандом>

# --- приложение ---
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://app:<тот_же_пароль>@postgres:5432/app?schema=public
REDIS_URL=redis://:<тот_же_пароль>@redis:6379
JWT_SECRET=<длинный_рандом>
CORS_ORIGIN=https://example.com
```

Пароли генерь так: `openssl rand -base64 32`

```bash
chmod 600 ~/back/.env
```

### 2.3 Секреты в GitHub

**Это для справки** — все секреты ниже уже созданы и настроены в репозитории, заводить их заново не нужно. Раздел просто объясняет, что это такое и откуда `deploy.yml` берёт данные для подключения к серверу.

**Settings (репозитория) → Secrets and variables → Actions → New repository secret**

|Name|Значение|
|---|---|
|`SSH_PRIVATE_KEY`|содержимое `~/.ssh/gh_deploy_back` целиком, включая строки `-----BEGIN/END-----`|
|`SSH_KNOWN_HOSTS`|вывод `ssh-keyscan -H YOUR_SERVER_IP`|
|`DEPLOY_HOST`|IP или домен сервера|
|`DEPLOY_USER`|`deploy`|
|`DEPLOY_PATH`|`/home/deploy/back`|

---

### 2.4 Первый запуск

Первый раз лучше поднять базы руками, чтобы отловить ошибки в конфиге без пайплайна.

```bash
su - deploy && cd ~/back

# проверяем, что compose видит переменные
docker compose -f docker-compose.prod.yml config

docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml ps
```

Теперь запушь что-нибудь в `main`. После успешного job'а `build` образ появится на вкладке **Packages** в профиле/репозитории. Дальше `deploy` сам вызовет `deploy.sh`.

Проверка:

```bash
curl -i http://localhost:3000/health
curl -i https://api.example.com/health
docker compose -f docker-compose.prod.yml logs -f api
```

---

### 2.5 Откат

Каждый образ тегируется коммитом, поэтому откат — это деплой старого тега.

**Через UI:** Actions → _Deploy backend_ → **Run workflow** → в поле `tag` вписать старый short-sha (первые 7 символов коммита) → Run.

**Руками на сервере (быстрее):**

```bash
ssh deploy@server
cd ~/back
cat .image-prev          # предыдущий тег
./deploy.sh <старый_тег>
```

⚠️ Откат кода не откатывает миграции БД. Если миграция была деструктивной (`DROP COLUMN`), придётся откатывать отдельно. Правило: **избегай деструктивных миграций**, разноси их на два релиза — сначала перестань использовать колонку, в следующем релизе удали.

---

### 2.6 Чистка старых образов в ghcr

Приватные пакеты едят квоту Packages, а тегов копится по одному на коммит. Добавь отдельный workflow `.github/workflows/cleanup-packages.yml`:

**Это пример** — количество версий (`min-versions-to-keep`) и расписание (`cron`) подбери под себя.

```yaml
name: Cleanup old images

on:
  schedule:
    - cron: '0 4 * * 0' # каждое воскресенье
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/delete-package-versions@v5
        with:
          package-name: ${{ github.event.repository.name }}
          package-type: container
          min-versions-to-keep: 15
          ignore-versions: '^latest$'
```

Оставляет 15 последних версий — этого хватает и для отката, и чтобы не упереться в лимит.
