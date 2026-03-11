create table if not exists public.leads (
  id text primary key,
  company text not null,
  niche text not null,
  region text not null,
  monthlyBudget text not null,
  contact text not null,
  trigger text not null,
  stage text not null,
  score integer not null,
  priority text not null,
  message text not null,
  contactStatus text not null,
  createdAt timestamptz not null
);
