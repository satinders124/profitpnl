-- Backtesting Journal: extend the existing backtest tables for the journal feature.

-- Sessions: kind discriminator (lab = hidden terminal, journal = new journal)
-- plus a rules checklist so a "model" is the strategy rules.
alter table public.backtest_sessions
  add column if not exists kind text not null default 'lab'
    check (kind in ('lab', 'journal'));

alter table public.backtest_sessions
  add column if not exists rules jsonb not null default '[]'::jsonb;

-- Terminal-only not-nulls are not required for journal models.
alter table public.backtest_sessions alter column symbol drop not null;
alter table public.backtest_sessions alter column timeframe drop not null;

-- Trades: relax terminal-only not-nulls so journal rows can carry only what the
-- user actually logged (price / SL / target / BE / rule ticks / psychology / result).
alter table public.backtest_trades
  alter column symbol drop not null,
  alter column entry_price drop not null,
  alter column exit_price drop not null,
  alter column stop_loss drop not null,
  alter column quantity drop not null,
  alter column risk_amount drop not null,
  alter column pnl drop not null,
  alter column r_multiple drop not null,
  alter column balance_after drop not null;

-- Journal-specific columns.
alter table public.backtest_trades
  add column if not exists rule_ticks jsonb not null default '[]'::jsonb,
  add column if not exists be numeric null,
  add column if not exists deviations text null,
  add column if not exists psychology text null,
  add column if not exists result text null,
  add column if not exists risk numeric null,
  add column if not exists risk_unit text not null default 'currency'
    check (risk_unit in ('currency', 'percent')),
  add column if not exists trade_date date null;

create index if not exists backtest_sessions_kind_idx
  on public.backtest_sessions (user_id, kind);

-- Global backtest account size / currency setting (editable on the dashboard).
create table if not exists public.backtest_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_size numeric not null default 0,
  currency text not null default 'USD'
);

alter table public.backtest_profile enable row level security;

drop policy if exists "Users manage own backtest profile" on public.backtest_profile;
create policy "Users manage own backtest profile"
  on public.backtest_profile
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
