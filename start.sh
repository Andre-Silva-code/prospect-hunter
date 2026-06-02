#!/bin/sh

mkdir -p /app/data

# Grava todas as variáveis de ambiente do container em .env.runtime
env > /app/data/container-env-debug.txt 2>/dev/null || true
env > /app/.env.runtime 2>/dev/null || true

echo "NODE_ENV=production" >> /app/.env.runtime
echo "PORT=3000" >> /app/.env.runtime
echo "HOSTNAME=0.0.0.0" >> /app/.env.runtime

exec node --env-file=/app/.env.runtime server.js
