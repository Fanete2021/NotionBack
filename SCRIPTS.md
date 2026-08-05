# Скрипты проекта

Все команды запускаются из корня проекта (`backend`).

## npm-скрипты

Определены в `package.json`, вызываются через `npm run <имя>`.

| Команда | Что делает |
|---|---|
| `npm run build` | Компилирует TypeScript в `dist/` через `nest build` |
| `npm run start` | Запускает приложение (production-сборка из `dist/`) без watch-режима |
| `npm run start:dev` | Запуск в режиме разработки с **автоперезагрузкой** при изменении файлов (`nest start --watch`) |
| `npm run start:debug` | Как `start:dev`, но с активным отладчиком (порт для дебага по умолчанию) |
| `npm run start:prod` | Запуск уже собранного бандла: `node dist/src/main.js` (используется в Docker) |
| `npm run lint` | Проверяет стиль кода ESLint'ом по всем `src/`, `test/` и **автоисправляет** ошибки |
| `npm run format` | Форматирует весь код Prettier'ом (только `.ts` файлы в `src/` и `test/`) |
| `npm test` | Запускает unit-тесты (Jest) один раз |
| `npm run test:watch` | Запускает тесты в watch-режиме (перезапуск при изменениях) |
| `npm run test:cov` | Запускает тесты со сбором покрытия кода, отчёт в `coverage/` |
| `npm run test:debug` | Запуск тестов с отладчиком Node.js (`--inspect-brk`) |
| `npm run test:e2e` | Запускает e2e-тесты (конфиг `test/jest-e2e.json`) |
| `npm run db:up` | Поднимает только PostgreSQL в Docker |
| `npm run db:down` | Останавливает и удаляет контейнеры Docker Compose |

## Prisma-команды

| Команда | Что делает |
|---|---|
| `npm run prisma:generate` | Генерирует Prisma Client по `prisma/schema.prisma` (нужно после каждого изменения схемы) |
| `npm run prisma:migrate` | Создаёт и применяет миграцию БД (dev-режим, с названием для миграции) |
| `npm run prisma:studio` | Открывает GUI-просмотрщик БД (Prisma Studio) в браузере |

## Docker

### Продакшен (обычная разработка через контейнер)

```powershell
docker compose up -d --build          # собрать и запустить postgres + redis + app
docker compose up -d postgres redis   # запустить только БД и redis
docker compose down                   # остановить всё
docker compose stop app               # остановить только приложение
```

### Режим разработки с автоперезагрузкой

`Dockerfile.dev` и `docker-compose.dev.yml` **не в git** (см. `.gitignore`) и нужны локально, чтобы не пересобирать образ при каждой правке кода — исходники монтируются в контейнер, а `nest start --watch` перезапускает приложение сам.

```powershell
docker compose stop app
docker compose -f docker-compose.dev.yml up -d --build app
```

После изменения `prisma/schema.prisma` в dev-контейнере перегенерируй клиент:

```powershell
docker compose -f docker-compose.dev.yml exec app npx prisma generate
```

## Типичный цикл работы

1. `npm run db:up` — поднять PostgreSQL (или весь `docker compose up -d`).
2. `npm run start:dev` — запустить backend с hot-reload.
3. Правки в `src/` — приложение перезапускается само.
4. Изменил схему БД → `npm run prisma:migrate` (создаст миграцию), затем `npm run prisma:generate`.
5. Перед коммитом: `npm run lint` и `npm test`.

## Прочее

- `prepare: husky` — автоматически срабатывает при `npm install`, настраивает git-хуки (lint/test перед push).
