# ---------- deps (все зависимости, включая dev) ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Добавляем libc6-compat для работы native модулей (bcrypt и т.д.) на Alpine
RUN apk add --no-cache python3 make g++ build-base libc6-compat

ENV HUSKY=0
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

COPY package*.json ./
# Временно используем install вместо ci, чтобы обойти возможные ошибки в lock-файле
RUN npm install

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
ENV HUSKY=0
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---------- prod-deps ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
ENV HUSKY=0
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
RUN npm prune --omit=dev && npm cache clean --force

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/Fanete2021/NotionBack"

ENV NODE_ENV=production
ENV PORT=8000

RUN apk add --no-cache curl openssl

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
