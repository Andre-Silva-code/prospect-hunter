#!/bin/sh
set -e

mkdir -p /app/data

# Grava todas as variáveis de ambiente do container em .env.runtime
env | grep -v '^_' > /app/.env.runtime

# Garante NODE_ENV e porta
echo "NODE_ENV=production" >> /app/.env.runtime
echo "PORT=3000" >> /app/.env.runtime
echo "HOSTNAME=0.0.0.0" >> /app/.env.runtime

exec node --env-file=/app/.env.runtime server.js
