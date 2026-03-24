-- 1) Ensure table exists with the current schema.
create table if not exists public.leads (
  id text primary key,
  user_id text,
  company text not null,
  niche text not null,
  region text not null,
  monthly_budget text not null,
  contact text not null,
  trigger text not null,
  stage text not null,
  score integer not null,
  priority text not null,
  message text not null,
  contact_status text not null,
  created_at timestamptz not null,
  source text,
  icp text,
  follow_up_interval_days integer,
  follow_up_step integer,
  next_follow_up_at timestamptz,
  last_contact_at timestamptz
);

-- 2) Migrate legacy column names (from earlier versions).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'monthlybudget'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'monthly_budget'
  ) then
    execute 'alter table public.leads rename column monthlybudget to monthly_budget';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'contactstatus'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'contact_status'
  ) then
    execute 'alter table public.leads rename column contactstatus to contact_status';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'createdat'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.leads rename column createdat to created_at';
  end if;
end $$;

-- 3) Ensure all required columns exist.
alter table public.leads add column if not exists user_id text;
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists icp text;
alter table public.leads add column if not exists follow_up_interval_days integer;
alter table public.leads add column if not exists follow_up_step integer;
alter table public.leads add column if not exists next_follow_up_at timestamptz;
alter table public.leads add column if not exists last_contact_at timestamptz;

-- 4) Normalize required data constraints.
update public.leads
set user_id = 'owner'
where user_id is null;

alter table public.leads
  alter column user_id set not null;

-- 5) Helpful index for user-scoped reads.
create index if not exists leads_user_created_idx
  on public.leads (user_id, created_at desc);
