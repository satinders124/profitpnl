-- Migration to add live active shift targets, and live trade tracking 
-- to support a real-time Interactive "AI Risk-Guard" Terminal overlay directly on the dashboard.

alter table public.trader_shifts 
  add column if not exists target_profit numeric null,
  add column if not exists max_drawdown_limit numeric null;

create table if not exists public.running_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_id uuid not null references public.trader_shifts(id) on delete cascade,
  strategy_id uuid null, -- reference to playbook if saved
  strategy_name text not null,
  rules_followed jsonb not null default '[]'::jsonb, -- checklist of rules followed
  entry_price numeric not null,
  sl_price numeric not null,
  tp_price numeric not null,
  risk_amount numeric not null, -- Drawdown limit / risk on this trade
  potential_profit numeric not null, -- Expected target profit on this trade
  lot_size numeric not null,
  pips_ticks numeric not null,
  is_caution boolean not null default false, -- auto-warns if risk exceeds plan
  status text not null default 'running' check (status in ('running', 'closed')),
  exit_price numeric null,
  pnl_realized numeric null,
  created_at timestamptz not null default now()
);

create index if not exists running_trades_user_idx on public.running_trades (user_id);
create index if not exists running_trades_shift_idx on public.running_trades (shift_id);

alter table public.running_trades enable row level security;

drop policy if exists "Users can manage running trades" on public.running_trades;
create policy "Users can manage running trades"
  on public.running_trades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
