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
# В Dockerfile уже прописана команда prisma migrate deploy перед стартом,
# но можно продублировать здесь для надежности или запустить отдельно.
$COMPOSE run --rm api npx prisma migrate deploy

echo "==> Restart api"
$COMPOSE up -d --no-deps api

echo "==> Cleanup"
docker image prune -f

$COMPOSE ps
echo "==> Done"
