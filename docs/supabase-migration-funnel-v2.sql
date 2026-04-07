-- Migration: Funnel v2 — Proposta follow-up + Reativação de perdidos
-- Rodar no Supabase SQL Editor: https://supabase.com/dashboard/project/svkcluuloapmotczeuqw/sql

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS proposal_entered_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposal_follow_up_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reactivation_sent_at TIMESTAMPTZ;

-- Índice para busca eficiente de leads em Proposta pendentes
CREATE INDEX IF NOT EXISTS idx_leads_stage_proposal
  ON leads (stage)
  WHERE stage = 'Proposta';

-- Índice para busca de leads Perdidos sem reativação
CREATE INDEX IF NOT EXISTS idx_leads_stage_lost
  ON leads (stage)
  WHERE stage = 'Perdido';
