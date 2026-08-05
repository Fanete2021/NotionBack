# NotionBack

NestJS backend for the NotionBack project with Prisma, JWT auth, Redis-backed refresh-token sessions, and Swagger.

## Tech stack

- NestJS 11
- TypeScript
- Prisma + PostgreSQL
- Redis
- Passport + JWT
- Swagger

## Requirements

- Node.js 20+
- Docker Desktop (for PostgreSQL and Redis)
- npm

## Environment variables

Create a `.env` file in the project root with at least:

```env
PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notionback?schema=public

JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=2592000

BCRYPT_SALT_ROUNDS=10

REDIS_HOST=localhost
REDIS_PORT=6379
FRONT_URL=http://localhost:3000
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

3. Generate Prisma client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the app in development mode:

```bash
npm run start:dev
```

## Auth flow

The API now uses a split-token approach:

- Access token: short-lived JWT, used for protected routes.
- Refresh token: longer-lived JWT stored in an HttpOnly cookie and tracked in Redis.

### Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Refresh tokens are stored in Redis under a per-user set, which allows revocation and validation of individual sessions.

## Swagger

Swagger UI is available at:

```text
http://localhost:8000/api
```

## Testing

```bash
npm test
npm run test:e2e
```

## Build

```bash
npm run build
```
