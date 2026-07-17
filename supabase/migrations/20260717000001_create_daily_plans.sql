-- Daily Trading Plan persistence + Plan vs Execution accountability.
-- Stores one accepted/generated plan per user per trading date.

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  risk_level text not null,
  tone text not null default 'gold' check (tone in ('green', 'gold', 'red')),
  max_trades integer not null default 0,
  risk_per_trade numeric not null default 0,
  risk_scale text not null default '',
  allowed_setups jsonb not null default '[]'::jsonb,
  avoid_list jsonb not null default '[]'::jsonb,
  stop_rules jsonb not null default '[]'::jsonb,
  focus text not null default '',
  source_context jsonb not null default '{}'::jsonb,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists daily_plans_user_date_idx on public.daily_plans (user_id, plan_date desc);

alter table public.daily_plans enable row level security;

drop policy if exists "Users can manage own daily plans" on public.daily_plans;
create policy "Users can manage own daily plans"
  on public.daily_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
