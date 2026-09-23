#!/usr/bin/env bash
# Полная пересборка локального инфра-окружения с нуля: без слоёв кэша, без
# старых volume'ов (данные Postgres/Redis/MinIO) и без старых образов.
# Цель — проверить, что инфраструктура поднимается так же, как на чистой машине.
# Само приложение запускается на хосте (`npm run dev:up` / `npm run start:dev`).
set -euo pipefail

COMPOSE="docker compose -f docker-compose.local.yml"

echo "==> Останавливаю и удаляю контейнеры, volume'ы и образы..."
$COMPOSE down -v --rmi all

echo "==> Чищу build-кэш Docker..."
docker builder prune -af

echo "==> Поднимаю инфраструктуру с нуля..."
$COMPOSE up --build -d

echo "==> Жду, пока сервисы станут здоровыми..."
sleep 5
$COMPOSE ps

echo "==> Проверяю, что нет упавших/нездоровых сервисов..."
if $COMPOSE ps --status running | grep -qiE "unhealthy|exited"; then
  echo "FAIL: часть сервисов не поднялась, смотри вывод выше"
  exit 1
fi
echo "OK: инфраструктура поднялась"
