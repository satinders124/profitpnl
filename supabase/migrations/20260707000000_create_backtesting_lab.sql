-- ProfitPnL TradingView-style manual backtesting lab.

create table if not exists public.backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  symbol text not null,
  market text null,
  timeframe text not null,
  start_date date null,
  end_date date null,
  starting_balance numeric not null,
  current_balance numeric null,
  commission_per_trade numeric not null default 0,
  slippage_ticks numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backtest_sessions_user_created_idx on public.backtest_sessions (user_id, created_at desc);
create index if not exists backtest_sessions_symbol_idx on public.backtest_sessions (symbol, timeframe);

create table if not exists public.backtest_trades (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.backtest_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  entry_time timestamptz not null,
  exit_time timestamptz not null,
  entry_price numeric not null,
  exit_price numeric not null,
  stop_loss numeric not null,
  take_profit numeric null,
  quantity numeric not null,
  risk_amount numeric not null,
  pnl numeric not null,
  r_multiple numeric not null,
  balance_after numeric not null,
  exit_reason text not null default 'manual' check (exit_reason in ('manual', 'stop_loss', 'take_profit')),
  fees numeric not null default 0,
  setup text null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists backtest_trades_session_idx on public.backtest_trades (session_id, entry_time);
create index if not exists backtest_trades_user_idx on public.backtest_trades (user_id, created_at desc);

alter table public.backtest_sessions enable row level security;
alter table public.backtest_trades enable row level security;

drop policy if exists "Users can manage own backtest sessions" on public.backtest_sessions;
create policy "Users can manage own backtest sessions"
  on public.backtest_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own backtest trades" on public.backtest_trades;
create policy "Users can manage own backtest trades"
  on public.backtest_trades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional bridge to existing journal analytics. These columns let future work
-- compare live/demo/backtest/forward-test trades in the main trades table.
alter table public.trades add column if not exists trade_mode text not null default 'live';
alter table public.trades add column if not exists backtest_session_id uuid null references public.backtest_sessions(id) on delete set null;

create index if not exists trades_trade_mode_idx on public.trades (user_id, trade_mode);
create index if not exists trades_backtest_session_idx on public.trades (backtest_session_id);
