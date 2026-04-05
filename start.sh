#!/bin/sh
# Debug: salvar todas as vars de ambiente disponíveis no container
env > /app/data/container-env-debug.txt 2>/dev/null || true

# Usa .env.production como base e permite override por variáveis do container
cp /app/.env.production /app/.env.runtime

# Override com vars do container se estiverem definidas
for VAR in SUPABASE_URL SUPABASE_ANON_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
           NEXTAUTH_URL NEXTAUTH_SECRET UAZAPI_API_URL UAZAPI_INSTANCE_ID UAZAPI_API_TOKEN \
           OUTREACH_CRON_SECRET OWNER_PHONE GEMINI_API_KEY ENABLE_LOCAL_AUTH \
           LOCAL_AUTH_EMAIL LOCAL_AUTH_PASSWORD OUTREACH_DELAY_MS LEADS_STORAGE_PROVIDER; do
  eval "VAL=\$$VAR"
  if [ -n "$VAL" ]; then
    # Remove linha existente e adiciona com novo valor
    grep -v "^${VAR}=" /app/.env.runtime > /app/.env.runtime.tmp && mv /app/.env.runtime.tmp /app/.env.runtime
    echo "${VAR}=${VAL}" >> /app/.env.runtime
  fi
done

echo "NODE_ENV=production" >> /app/.env.runtime

exec node --env-file=/app/.env.runtime server.js
