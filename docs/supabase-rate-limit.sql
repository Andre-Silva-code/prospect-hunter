-- Rate Limit Buckets
-- Persiste o estado dos token buckets entre instâncias serverless.
-- Substitui o rate limiter em memória, que não funciona em múltiplos servidores.
--
-- Como rodar: cole este SQL no Supabase > SQL Editor e execute.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key         TEXT PRIMARY KEY,                   -- ex: "uazapi:user-123"
  timestamps  TIMESTAMPTZ[] NOT NULL DEFAULT '{}', -- timestamps das requisições recentes
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índice para limpeza periódica de registros antigos (optional maintenance)
CREATE INDEX IF NOT EXISTS rate_limit_updated_at_idx
  ON public.rate_limit_buckets (updated_at);

-- NOTA: RLS não aplicado intencionalmente.
-- As chamadas vêm do servidor (service role / anon key em server-side),
-- nunca diretamente do browser.
--
-- NOTA sobre race conditions: o UPSERT não usa lock explícito.
-- Para o volume atual (Uazapi: 10 req/5min), o risco de overcount é mínimo
-- e aceitável. Em volumes maiores, considere uma Supabase Edge Function com
-- SELECT ... FOR UPDATE para garantir atomicidade.
