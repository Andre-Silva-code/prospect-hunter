-- Outreach Queue: fila de envio automático via WhatsApp (Uazapi)
-- Executa após docs/supabase-leads.sql

create table if not exists public.outreach_queue (
  id text primary key,
  lead_id text not null,
  user_id text not null,
  phone text not null,
  whatsapp_jid text,
  status text not null default 'pending',
  scheduled_at timestamptz,
  sent_at timestamptz,
  message_id text,
  pdf_generated boolean default false,
  attempt_count integer default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Status + scheduled_at: usado pelo cron que processa itens agendados
create index if not exists outreach_queue_status_scheduled_idx
  on public.outreach_queue (status, scheduled_at)
  where status in ('scheduled', 'sent', 'follow_up_1');

-- Lead lookup: evitar duplicatas e encontrar item por lead
create index if not exists outreach_queue_lead_idx
  on public.outreach_queue (lead_id);

-- User lookup: listar fila de um usuário
create index if not exists outreach_queue_user_idx
  on public.outreach_queue (user_id);

-- RLS (Row Level Security) - cada usuário só vê seus próprios itens
alter table public.outreach_queue enable row level security;

create policy "Users can manage their own outreach queue items"
  on public.outreach_queue
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);
