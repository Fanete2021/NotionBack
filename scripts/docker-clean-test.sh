#!/usr/bin/env bash
# Полная пересборка docker-окружения с нуля: без слоёв кэша, без старых
# volume'ов (данные Postgres/Redis) и без старых образов.
# Цель — проверить, что проект поднимается так же, как на чистой машине.
set -euo pipefail

echo "==> Останавливаю и удаляю контейнеры, volume'ы и образы..."
docker compose down -v --rmi all

echo "==> Чищу build-кэш Docker..."
docker builder prune -af

echo "==> Собираю и поднимаю с нуля..."
docker compose up --build -d

echo "==> Жду запуска app..."
sleep 5
docker compose logs app --tail=50

PORT_VALUE=$(grep -E '^PORT=' .env | cut -d '=' -f2 || echo "8000")
PORT_VALUE=${PORT_VALUE:-8000}

echo "==> Проверяю health endpoint..."
if curl -sf "http://localhost:${PORT_VALUE}/api" > /dev/null; then
  echo "OK: приложение поднялось"
else
  echo "FAIL: приложение не отвечает, смотри логи выше"
  exit 1
fi
