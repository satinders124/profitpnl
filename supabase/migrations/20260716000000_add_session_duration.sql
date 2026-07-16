-- Add session duration tracking to trader shifts
alter table public.trader_shifts
  add column if not exists session_duration_minutes integer null;

create index if not exists trader_shifts_duration_idx on public.trader_shifts(session_duration_minutes);
