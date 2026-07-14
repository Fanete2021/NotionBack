FROM node:22-alpine AS build

WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notionback?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY nest-cli.json prisma.config.ts tsconfig.json tsconfig.build.json ./

RUN npm ci

COPY src ./src

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  && npm cache clean --force

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
