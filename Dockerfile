# ---- deps ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Declara todos os build args
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG APIFY_TOKEN
ARG APIFY_API_BASE_URL
ARG PROSPECT_APIFY_INSTAGRAM_TASK_ID
ARG PROSPECT_APIFY_INSTAGRAM_ACTOR_ID
ARG PROSPECT_APIFY_LINKEDIN_TASK_ID
ARG PROSPECT_APIFY_LINKEDIN_ACTOR_ID
ARG PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID
ARG PROSPECT_APIFY_GOOGLE_MAPS_ACTOR_ID
ARG PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID
ARG PROSPECT_APIFY_GOOGLE_MY_BUSINESS_ACTOR_ID
ARG GEMINI_API_KEY
ARG GEMINI_API_BASE_URL
ARG GEMINI_MODEL
ARG GOOGLE_MAPS_API_KEY
ARG UAZAPI_API_URL
ARG UAZAPI_INSTANCE_ID
ARG UAZAPI_API_TOKEN
ARG OUTREACH_CRON_SECRET
ARG OUTREACH_DELAY_MS
ARG OUTREACH_MIN_SCORE
ARG OWNER_PHONE
ARG ENABLE_LOCAL_AUTH
ARG LOCAL_AUTH_EMAIL
ARG LOCAL_AUTH_PASSWORD
ARG LOCAL_AUTH_NAME
ARG LEADS_STORAGE_PROVIDER
ARG USE_LOCAL_STORAGE
ARG PROSPECTING_ENABLE_DEMO_FALLBACK
ARG LOG_LEVEL

# Expõe os build args como ENV para o Next.js usar no build
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV LEADS_STORAGE_PROVIDER=$LEADS_STORAGE_PROVIDER

# Grava .env.production no builder para copiar ao runner
RUN echo "SUPABASE_URL=${SUPABASE_URL}" >> /app/.env.production && \
    echo "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" >> /app/.env.production && \
    echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}" >> /app/.env.production && \
    echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" >> /app/.env.production && \
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" >> /app/.env.production && \
    echo "NEXTAUTH_URL=${NEXTAUTH_URL}" >> /app/.env.production && \
    echo "NEXTAUTH_SECRET=${NEXTAUTH_SECRET}" >> /app/.env.production && \
    echo "APIFY_TOKEN=${APIFY_TOKEN}" >> /app/.env.production && \
    echo "APIFY_API_BASE_URL=${APIFY_API_BASE_URL}" >> /app/.env.production && \
    echo "PROSPECT_APIFY_INSTAGRAM_TASK_ID=${PROSPECT_APIFY_INSTAGRAM_TASK_ID}" >> /app/.env.production && \
    echo "PROSPECT_APIFY_INSTAGRAM_ACTOR_ID=${PROSPECT_APIFY_INSTAGRAM_ACTOR_ID}" >> /app/.env.production && \
    echo "PROSPECT_APIFY_LINKEDIN_TASK_ID=${PROSPECT_APIFY_LINKEDIN_TASK_ID}" >> /app/.env.production && \
    echo "PROSPECT_APIFY_LINKEDIN_ACTOR_ID=${PROSPECT_APIFY_LINKEDIN_ACTOR_ID}" >> /app/.env.production && \
    echo "PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID=${PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID}" >> /app/.env.production && \
    echo "PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID=${PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID}" >> /app/.env.production && \
    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> /app/.env.production && \
    echo "GEMINI_API_BASE_URL=${GEMINI_API_BASE_URL}" >> /app/.env.production && \
    echo "GEMINI_MODEL=${GEMINI_MODEL}" >> /app/.env.production && \
    echo "GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}" >> /app/.env.production && \
    echo "UAZAPI_API_URL=${UAZAPI_API_URL}" >> /app/.env.production && \
    echo "UAZAPI_INSTANCE_ID=${UAZAPI_INSTANCE_ID}" >> /app/.env.production && \
    echo "UAZAPI_API_TOKEN=${UAZAPI_API_TOKEN}" >> /app/.env.production && \
    echo "OUTREACH_CRON_SECRET=${OUTREACH_CRON_SECRET}" >> /app/.env.production && \
    echo "OUTREACH_DELAY_MS=${OUTREACH_DELAY_MS}" >> /app/.env.production && \
    echo "OUTREACH_MIN_SCORE=${OUTREACH_MIN_SCORE}" >> /app/.env.production && \
    echo "OWNER_PHONE=${OWNER_PHONE}" >> /app/.env.production && \
    echo "ENABLE_LOCAL_AUTH=${ENABLE_LOCAL_AUTH}" >> /app/.env.production && \
    echo "LOCAL_AUTH_EMAIL=${LOCAL_AUTH_EMAIL}" >> /app/.env.production && \
    echo "LOCAL_AUTH_PASSWORD=${LOCAL_AUTH_PASSWORD}" >> /app/.env.production && \
    echo "LOCAL_AUTH_NAME=${LOCAL_AUTH_NAME}" >> /app/.env.production && \
    echo "LEADS_STORAGE_PROVIDER=${LEADS_STORAGE_PROVIDER}" >> /app/.env.production && \
    echo "USE_LOCAL_STORAGE=${USE_LOCAL_STORAGE}" >> /app/.env.production && \
    echo "PROSPECTING_ENABLE_DEMO_FALLBACK=${PROSPECTING_ENABLE_DEMO_FALLBACK}" >> /app/.env.production && \
    echo "NODE_ENV=production" >> /app/.env.production && \
    echo "PORT=3000" >> /app/.env.production && \
    echo "HOSTNAME=0.0.0.0" >> /app/.env.production

RUN npm run build

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Arquivos pdfkit necessários em runtime
COPY --from=builder /app/node_modules/pdfkit/js/data ./node_modules/pdfkit/js/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.production ./.env.production

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "--env-file=/app/.env.production", "server.js"]
