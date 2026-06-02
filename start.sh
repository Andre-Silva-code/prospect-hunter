#!/bin/sh
# Debug: salvar todas as vars de ambiente disponíveis no container
mkdir -p /app/data
env > /app/data/container-env-debug.txt 2>/dev/null || true

# Usa .env.production gerado no build como base
cp /app/.env.production /app/.env.runtime

# Override com variáveis injetadas em runtime pelo EasyPanel (se houver)
for VAR in \
  SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
  NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
  NEXTAUTH_URL NEXTAUTH_SECRET \
  UAZAPI_API_URL UAZAPI_INSTANCE_ID UAZAPI_API_TOKEN UAZAPI_WEBHOOK_SECRET \
  OUTREACH_CRON_SECRET OUTREACH_DELAY_MS OUTREACH_MIN_SCORE \
  OWNER_PHONE \
  GEMINI_API_KEY GEMINI_MODEL GEMINI_API_BASE_URL \
  APIFY_TOKEN APIFY_API_BASE_URL \
  PROSPECT_APIFY_INSTAGRAM_TASK_ID PROSPECT_APIFY_INSTAGRAM_ACTOR_ID \
  PROSPECT_APIFY_LINKEDIN_TASK_ID PROSPECT_APIFY_LINKEDIN_ACTOR_ID \
  PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID PROSPECT_APIFY_GOOGLE_MAPS_ACTOR_ID \
  PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID PROSPECT_APIFY_GOOGLE_MY_BUSINESS_ACTOR_ID \
  PROSPECT_CONNECTOR_INSTAGRAM_URL PROSPECT_CONNECTOR_LINKEDIN_URL PROSPECT_CONNECTOR_TOKEN \
  GOOGLE_MAPS_API_KEY \
  LEADS_STORAGE_PROVIDER USE_LOCAL_STORAGE PROSPECTING_ENABLE_DEMO_FALLBACK \
  ENABLE_LOCAL_AUTH LOCAL_AUTH_EMAIL LOCAL_AUTH_PASSWORD LOCAL_AUTH_NAME \
  LOG_LEVEL; do
  eval "VAL=\$$VAR"
  if [ -n "$VAL" ]; then
    grep -v "^${VAR}=" /app/.env.runtime > /app/.env.runtime.tmp && mv /app/.env.runtime.tmp /app/.env.runtime
    echo "${VAR}=${VAL}" >> /app/.env.runtime
  fi
done

echo "NODE_ENV=production" >> /app/.env.runtime
echo "PORT=3000" >> /app/.env.runtime
echo "HOSTNAME=0.0.0.0" >> /app/.env.runtime

exec node --env-file=/app/.env.runtime server.js
