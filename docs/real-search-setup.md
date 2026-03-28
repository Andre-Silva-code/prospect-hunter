# Real Search Setup (Apify + Google Places)

Este guia evita o cenário "busca sem resultados" no ambiente local e em produção.

## Objetivo

Configurar as fontes reais da aba de prospecção:

- Instagram (Apify)
- LinkedIn (Apify)
- Google Maps (Apify + fallback Google Places)
- Google Meu Negócio (Apify + fallback Google Places)

## 1) Variáveis obrigatórias no `.env.local`

```env
APIFY_TOKEN=...
APIFY_API_BASE_URL=https://api.apify.com

PROSPECT_APIFY_INSTAGRAM_TASK_ID=...
PROSPECT_APIFY_GOOGLE_MAPS_TASK_ID=...
PROSPECT_APIFY_GOOGLE_MY_BUSINESS_TASK_ID=...

# LinkedIn: use task OU actor
PROSPECT_APIFY_LINKEDIN_TASK_ID=...
PROSPECT_APIFY_LINKEDIN_ACTOR_ID=...

GOOGLE_MAPS_API_KEY=...

# Para busca real, mantenha false
PROSPECTING_ENABLE_DEMO_FALLBACK=false
```

Notas:

- Para LinkedIn, se a sua task retornar erro de plano, deixe `PROSPECT_APIFY_LINKEDIN_TASK_ID` vazio e configure `PROSPECT_APIFY_LINKEDIN_ACTOR_ID`.
- O fallback demo existe para desenvolvimento, mas deve ficar desativado para operação real.

## 2) Validar token Apify

```bash
curl "https://api.apify.com/v2/users/me?token=$APIFY_TOKEN"
```

Esperado: HTTP 200 com dados do usuário.

## 3) Validar tasks/actor

Exemplo (task):

```bash
curl "https://api.apify.com/v2/actor-tasks/$PROSPECT_APIFY_INSTAGRAM_TASK_ID?token=$APIFY_TOKEN"
```

Exemplo (actor):

```bash
curl "https://api.apify.com/v2/acts/$PROSPECT_APIFY_LINKEDIN_ACTOR_ID?token=$APIFY_TOKEN"
```

## 4) Configurar Google Places fallback

No Google Cloud Console:

1. Ative `Places API (New)`.
2. Gere uma API key.
3. Restrinja por API para `Places API (New)`.
4. Defina a chave em `GOOGLE_MAPS_API_KEY`.

## 5) Teste local ponta a ponta

1. Suba a app:

```bash
npm run dev
```

2. Faça login local:

- email: `admin@prospecthunter.local`
- senha: `prospect123`

3. Na tela de prospecção, execute busca com as quatro fontes.

4. Verifique `Status das integrações`:

- Instagram/LinkedIn devem mostrar `lead(s) via Apify ...`
- Google Maps/GMB podem usar fallback `Google Places` se Apify falhar

## Diagnóstico rápido de falhas comuns

- `Apify indisponivel (402)`: limitação de plano/crédito/ator.
- `0 lead(s) via Apify ...`: task executou, mas query/filtros não trouxeram dados.
- `GOOGLE_MAPS_API_KEY nao configurada`: fallback Google Places desabilitado por falta de chave.
- `Apify dataset erro: ...`: actor retornou erro semântico no dataset (ex.: restrição de plano).

## Checklist antes de produção

- `PROSPECTING_ENABLE_DEMO_FALLBACK=false`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Validação automatizada

Após configurar `.env.local`, rode `npm run check:prospecting-sources`. Esse script carrega as variáveis, executa `searchProspects` com dados de exemplo e mostra em tabela o status/contagem por fonte. Ele falha se nenhum conector responder, mantendo os logs para inspeção.
