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
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/.env.production ./.env.production

# Pasta de dados persistentes
RUN mkdir -p /app/data && chmod +x /app/start.sh

EXPOSE 3000
CMD ["/bin/sh", "/app/start.sh"]
