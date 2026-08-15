# NotionBack

NestJS бэкенд проекта NotionBack: Prisma, JWT-авторизация, refresh-токены на базе Redis, Swagger.

## Технологический стек

- NestJS 11
- TypeScript
- Prisma + PostgreSQL
- Redis
- Passport + JWT
- Swagger

## Требования

- Node.js 20+
- Docker Desktop (для PostgreSQL и Redis)
- npm
- `make` — только если хочешь использовать make-команды (Git Bash / WSL / macOS / Linux). Все make-команды — тонкие обёртки над `npm run`, так что сырые npm-команды работают везде.

## Быстрый старт (Docker, рекомендуется)

Весь стек (PostgreSQL + Redis + приложение с hot-reload) запускается в Docker:

```bash
npm run dev:up   # или: make dev-up
```

Что произойдёт автоматически:

1. При первом запуске создастся `.env` из `.env.example` (если `.env` отсутствует).
2. Соберутся и запустятся контейнеры `postgres`, `redis` и `app`.
3. Команда дождётся, пока БД станут здоровыми.
4. Применятся миграции Prisma, и приложение стартует в watch-режиме (`start:dev`).

Всё, ничего больше руками делать не нужно — ни ставить зависимости, ни гонять миграции вручную.

Дальше:

```bash
npm run dev:logs   # или: make dev-logs  — следить за логами приложения
npm run dev:down   # или: make dev-down  — остановить стек
```

Swagger UI: http://localhost:8000/api/docs

> Примечание: простой `docker compose up` тоже работает (приложение тогда использует dev-секреты по умолчанию из `docker-compose.yml`), но `.env` автоматически создаётся только через `npm run dev:up`. Предпочтительно использовать `dev:up`.

## Команды

### Make

Требуется `make` (см. «Требования»). Каждая команда просто вызывает соответствующий npm-скрипт.

| Команда | Описание |
| --- | --- |
| `make dev-up` | Поднять полный dev-стек (автосоздаёт `.env`) |
| `make dev-logs` | Следить за логами приложения |
| `make dev-down` | Остановить dev-стек |
| `make db-up` | Поднять только postgres |
| `make db-down` | Остановить базы данных |
| `make env-init` | Создать `.env` из `.env.example`, если его нет |
| `make install` | Установить зависимости |
| `make build` | Собрать проект |
| `make start` | Запустить приложение |
| `make start-dev` | Запустить в dev-режиме (watch) |
| `make start-debug` | Запустить в debug-режиме |
| `make start-prod` | Запустить собранное приложение |
| `make prisma-generate` | Сгенерировать Prisma Client |
| `make prisma-migrate` | Применить миграции Prisma (dev) |
| `make prisma-seed` | Заполнить БД сидами |
| `make prisma-studio` | Открыть Prisma Studio |
| `make lint` | Линтинг с автоправками |
| `make format` | Форматирование кода через Prettier |
| `make test` | Запустить unit-тесты |
| `make test-watch` | Запустить тесты в watch-режиме |
| `make test-cov` | Запустить тесты с покрытием |
| `make test-debug` | Запустить тесты в debug-режиме |
| `make test-e2e` | Запустить e2e-тесты |
| `make docker-clean-test` | Полная пересборка с нуля (опасно: удаляет данные) |

### Raw npm

Используй их, если у тебя нет `make`. Каждая make-команда — алиас на соответствующую npm-команду.

| Команда | Описание |
| --- | --- |
| `npm run dev:up` | Поднять полный dev-стек (автосоздаёт `.env`) |
| `npm run dev:logs` | Следить за логами приложения |
| `npm run dev:down` | Остановить dev-стек |
| `npm run db:up` | Поднять только postgres |
| `npm run db:down` | Остановить базы данных |
| `npm run env:init` | Создать `.env` из `.env.example`, если его нет |
| `npm install` | Установить зависимости |
| `npm run build` | Собрать проект |
| `npm run start` | Запустить приложение |
| `npm run start:dev` | Запустить в dev-режиме (watch) |
| `npm run start:debug` | Запустить в debug-режиме |
| `npm run start:prod` | Запустить собранное приложение |
| `npm run prisma:generate` | Сгенерировать Prisma Client |
| `npm run prisma:migrate` | Применить миграции Prisma (dev) |
| `npm run prisma:seed` | Заполнить БД сидами |
| `npm run prisma:studio` | Открыть Prisma Studio |
| `npm run lint` | Линтинг с автоправками |
| `npm run format` | Форматирование кода через Prettier |
| `npm test` | Запустить unit-тесты |
| `npm run test:watch` | Запустить тесты в watch-режиме |
| `npm run test:cov` | Запустить тесты с покрытием |
| `npm run test:debug` | Запустить тесты в debug-режиме |
| `npm run test:e2e` | Запустить e2e-тесты |
| `npm run docker:clean-test` | Полная пересборка с нуля (опасно: удаляет данные) |

## Локальная разработка (без контейнеризации приложения)

Если предпочитаешь запускать NestJS на хосте, а в Docker держать только PostgreSQL:

1. Установить зависимости:

```bash
npm install
```

2. Запустить PostgreSQL (и Redis, если нужно):

```bash
npm run db:up
```

Если `.env` ещё не существует, он автоматически создастся из `.env.example`.

3. Сгенерировать Prisma Client, применить миграции и (опционально) засидить БД:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Запустить приложение в dev-режиме:

```bash
npm run start:dev
```

## Переменные окружения

`.env` автоматически создаётся из `.env.example` при первом `npm run dev:up` — обычно создавать его вручную не нужно. Скопируй и поправь значения, когда нужны реальные секреты:

```env
# Prisma / приложение
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notionback?schema=public"
FRONT_URL='http://localhost:3000'
PORT=8000

# Redis (локально)
REDIS_HOST='localhost'
REDIS_PORT=6379

# Auth (обязательно поменяй на реальные секреты!)
JWT_ACCESS_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=2592000
JWT_ACCESS_SECRET='change_me_access_token'
JWT_REFRESH_SECRET='change_me_refresh_token'

BCRYPT_SALT_ROUNDS=10

MAX_WORKSPACES_PER_USER=3

# Docker Compose (используется в docker-compose.yml)
POSTGRES_DB=notionback
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
APP_PORT=8000
```

### Справочник переменных

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://…@localhost:5432/notionback` | Строка подключения Prisma. В Docker переопределяется на сервис `postgres` |
| `FRONT_URL` | `http://localhost:3000` | Разрешённый CORS-источник |
| `PORT` | `8000` | Порт приложения |
| `REDIS_HOST` | `localhost` | Хост Redis. В Docker переопределяется на сервис `redis` |
| `REDIS_PORT` | `6379` | Порт Redis |
| `JWT_ACCESS_EXPIRES_IN` | `900` | Время жизни access-токена (секунды) |
| `JWT_REFRESH_EXPIRES_IN` | `2592000` | Время жизни refresh-токена (секунды) |
| `JWT_ACCESS_SECRET` | — | Секрет для access-токенов (обязателен) |
| `JWT_REFRESH_SECRET` | — | Секрет для refresh-токенов (обязателен) |
| `BCRYPT_SALT_ROUNDS` | `10` | Количество раундов соли bcrypt |
| `MAX_WORKSPACES_PER_USER` | `3` | Лимит воркспейсов на пользователя |
| `POSTGRES_DB` | `notionback` | Имя БД (Compose) |
| `POSTGRES_USER` | `postgres` | Пользователь БД (Compose) |
| `POSTGRES_PASSWORD` | `postgres` | Пароль БД (Compose) |
| `POSTGRES_PORT` | `5432` | Порт postgres на хосте (Compose) |
| `APP_PORT` | `8000` | Порт приложения на хосте (Compose) |

## Авторизация

В API используется подход с раздельными токенами:

- Access-токен: короткоживущий JWT для защищённых маршрутов.
- Refresh-токен: долгоживущий JWT в HttpOnly-cookie и отслеживается в Redis.

### Эндпоинты

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Refresh-токены хранятся в Redis как множество на пользователя, что позволяет отзывать и валидировать отдельные сессии.

## Swagger

Swagger UI доступен по адресу:

```text
http://localhost:8000/api/docs
```

## Тестирование

```bash
npm test
npm run test:e2e
```

## Сборка

```bash
npm run build
```