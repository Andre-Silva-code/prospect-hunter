-- ============================================================================
-- Correção: colunas ausentes na tabela `leads` (erro 500 ao salvar lead)
-- ----------------------------------------------------------------------------
-- Sintoma: salvar QUALQUER lead (qualquer fonte) retorna HTTP 500 no
--          POST /api/leads, com erro "supabase insert failed".
-- Causa provável: o banco de PRODUÇÃO não recebeu as migrações que adicionam
--          colunas mais recentes (source, funnel, qualification_score, etc.),
--          então o insert falha porque grava colunas inexistentes.
--
-- Como aplicar:
--   1) Supabase → seu projeto → SQL Editor → New query
--   2) Cole TODO este conteúdo e clique em "Run"
--   3) Tente salvar um lead de novo no app
--
-- Seguro: `add column if not exists` apenas cria o que falta; não altera nem
--          apaga nenhuma coluna ou dado existente.
-- ============================================================================

alter table public.leads add column if not exists user_id text;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists icp text;
alter table public.leads add column if not exists follow_up_interval_days integer;
alter table public.leads add column if not exists follow_up_step integer;
alter table public.leads add column if not exists next_follow_up_at timestamptz;
alter table public.leads add column if not exists last_contact_at timestamptz;

-- Qualificação de fit comercial (usada pelos leads, inclui os "Sem GMN" — Funil B)
alter table public.leads add column if not exists qualification_score integer;
alter table public.leads add column if not exists funnel text;
alter table public.leads add column if not exists contactable boolean;

-- Campos de follow-up de proposta / reativação (também podem faltar)
alter table public.leads add column if not exists proposal_entered_at timestamptz;
alter table public.leads add column if not exists proposal_follow_up_step integer;
alter table public.leads add column if not exists reactivation_sent_at timestamptz;

-- Confirmação: lista as colunas da tabela após a migração.
-- (o resultado deve incluir source, funnel, qualification_score, contactable…)
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'leads'
order by column_name;
