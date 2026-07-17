-- Public, shareable backtesting performance reports.

create table if not exists public.backtest_reports (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  model_ids jsonb not null default '[]'::jsonb,
  period_start date null,
  period_end date null,
  metrics jsonb not null,
  trades jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists backtest_reports_user_created_idx on public.backtest_reports (user_id, created_at desc);
create index if not exists backtest_reports_public_idx on public.backtest_reports (public_id);

alter table public.backtest_reports enable row level security;

drop policy if exists "Users can manage own backtest reports" on public.backtest_reports;
create policy "Users can manage own backtest reports"
  on public.backtest_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public can view public backtest reports" on public.backtest_reports;
create policy "Public can view public backtest reports"
  on public.backtest_reports
  for select
  using (visibility = 'public');
