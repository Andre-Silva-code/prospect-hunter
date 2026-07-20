# Integrações Técnicas — Prospect Hunter

**Tarefa C do progresso.md** — mapeamento das integrações externas do sistema.
**Atualizado:** 2026-07-20

Este documento descreve cada integração externa, para que serve, quais variáveis
de ambiente controla e como o sistema se comporta quando ela não está configurada.

---

## Visão geral

O Prospect Hunter combina fontes externas em 3 etapas do funil:

| Etapa                | Integrações                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| **Buscar leads**     | Apify (Instagram, LinkedIn, Google Maps, GMN), Google Places, conectores HTTP próprios |
| **Gerar mensagem**   | Gemini (IA)                                                                            |
| **Enviar / receber** | Uazapi (WhatsApp)                                                                      |
| **Persistir**        | Supabase (ou armazenamento local)                                                      |

---

## 1. Apify — Scraping de fontes sociais

- **Para quê:** rodar Actors/Tasks que raspam Instagram, LinkedIn, Google Maps e Google Meu Negócio.
- **Onde no código:** `lib/connectors/apify.ts`, `lib/connectors/apify-config.ts`
- **Variáveis:**
  - `APIFY_ENABLED` — liga/desliga a integração
  - `APIFY_TOKEN` — token de autenticação
  - `APIFY_API_BASE_URL` — base da API (default `https://api.apify.com`)
  - `PROSPECT_APIFY_*_ACTOR_ID` / `*_TASK_ID` — IDs dos Actors/Tasks por fonte
  - `APIFY_RATE_LIMIT_MAX`, `APIFY_RATE_LIMIT_WINDOW_MS`, `APIFY_BACKOFF_MS`
- **Fallback:** sem token/IDs → retorna "Sem conector configurado". Se `PROSPECTING_ENABLE_DEMO_FALLBACK=true`, usa dados demo (`demo-fallback.ts`).

## 2. Google Places API — Google Meu Negócio

- **Para quê:** buscar empresas por região/nicho direto na API do Google (fonte mais rica em sinais para qualificação: nota, avaliações, site, telefone).
- **Onde no código:** `lib/connectors/google-places.ts`, normalização em `normalizeGooglePlace` (`normalizers.ts`)
- **Variáveis:** `GOOGLE_MAPS_API_KEY`
- **Fallback:** sem chave → connector retorna vazio com status informativo.
- **Nota:** é aqui que o `qualifyLead()` (Tarefa B) já está integrado, populando `qualificationScore`, `funnel` e `contactable`.

## 3. Conectores HTTP próprios (Instagram / LinkedIn)

- **Para quê:** endpoint próprio opcional que retorna leads já formatados, com prioridade sobre o Apify.
- **Onde no código:** `lib/connectors/search.ts`
- **Variáveis:** `PROSPECT_CONNECTOR_INSTAGRAM_URL`, `PROSPECT_CONNECTOR_LINKEDIN_URL`, `PROSPECT_CONNECTOR_TOKEN`
- **Fallback:** sem URL → cai para o Apify automaticamente.

## 4. Gemini — Geração de mensagens (IA)

- **Para quê:** gerar as mensagens da cadência e apoiar a análise de leads.
- **Onde no código:** `lib/gemini-client.ts`
- **Variáveis:** `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RATE_LIMIT_MAX`, `GEMINI_RATE_LIMIT_WINDOW_MS`, `GEMINI_BACKOFF_MS`
- **Fallback:** sem chave → geração por IA indisponível (usar templates fixos).

## 5. Uazapi — WhatsApp

- **Para quê:** enviar as mensagens da cadência, checar se um número existe no WhatsApp e receber respostas via webhook.
- **Onde no código:** `lib/connectors/uazapi.ts`, webhook em `app/api/outreach/webhook/route.ts`
- **Variáveis:** `UAZAPI_API_URL`, `UAZAPI_API_TOKEN`, `UAZAPI_INSTANCE_ID`, `UAZAPI_WEBHOOK_SECRET`, `UAZAPI_RATE_LIMIT_MAX`, `UAZAPI_RATE_LIMIT_WINDOW_MS`
- **Fallback:** sem credenciais → envio de WhatsApp desabilitado.

## 6. Supabase — Persistência

- **Para quê:** armazenar leads, fila de outreach, rate limits.
- **Onde no código:** `lib/leads-repository.ts` (+ SQLs em `docs/*.sql`)
- **Variáveis:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LEADS_STORAGE_PROVIDER`
- **Fallback:** `USE_LOCAL_STORAGE=true` → usa armazenamento local em vez do Supabase.

---

## Orquestração de outreach

- **Onde no código:** `lib/outreach-orchestrator.ts`, `outreach-scheduler.ts`, `outreach-queue.ts`
- **Variáveis:** `OUTREACH_CRON_SECRET`, `OUTREACH_DELAY_MS`, `OUTREACH_MIN_SCORE`, `OUTREACH_SCHEDULER_ENABLED`, `OUTREACH_BRAND_NAME`, `OUTREACH_BRAND_COLOR`
- **Cron:** ver `docs/easypanel-cron-setup.md` e script `outreach:cron:local` no `package.json`.

---

## Como conferir o status das fontes

```bash
npm run check:prospecting-sources
```

(script em `scripts/check-prospecting-sources.ts`)

---

## Pendências identificadas (gap da Tarefa C)

- [ ] `qualifyLead()` só está integrado na fonte Google Places. Instagram/LinkedIn (via Apify)
      ainda usam apenas o score de popularidade — faltam sinais de `hasWebsite`/`hasGoogleProfile`.
- [ ] `lib/README.md` está desatualizado (cita axios, redis, bull e arquivos inexistentes).
- [ ] Não há um `.env` de exemplo comentado por integração — este documento supre parte disso.
