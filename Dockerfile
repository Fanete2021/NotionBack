# ---------- deps (все зависимости, включая dev) ----------
FROM node:22-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
ENV HUSKY=0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---------- prod deps (без dev) ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
ENV HUSKY=0
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/Fanete2021/NotionBack"

ENV NODE_ENV=production
ENV PORT=8000

RUN apk add --no-cache curl openssl

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
