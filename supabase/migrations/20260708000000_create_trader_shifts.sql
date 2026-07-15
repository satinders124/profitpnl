-- Migration to support active Trader Clock-In/Clock-Out and Shift Session parameters.
-- This supports a professional humanized PWA experience that calculates mental fatigue 
-- and renders highly detailed behavioral summaries at shift ends.

create table if not exists public.trader_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz null,
  
  -- Pre-Shift checklist variables
  sleep_quality integer not null check (sleep_quality between 1 and 10),
  stress_level integer not null check (stress_level between 1 and 10),
  discipline_level integer not null check (discipline_level between 1 and 10),
  pre_notes text null,

  -- Post-Shift checklist variables
  post_discipline integer null check (post_discipline between 1 and 10),
  emotions_felt text null, -- comma-separated tags or JSON
  lessons_learned text null,
  
  -- Generated AI Summary
  behavioral_summary text null, -- Detailed, humanized paragraph analyzing their focus window
  created_at timestamptz not null default now()
);

create index if not exists trader_shifts_user_idx on public.trader_shifts (user_id, clock_in desc);

alter table public.trader_shifts enable row level security;

drop policy if exists "Users can manage own shifts" on public.trader_shifts;
create policy "Users can manage own shifts"
  on public.trader_shifts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
