-- ProfitPnL public trading performance certificates.
-- Run this migration in Supabase before enabling certificate creation in production.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text null,
  title text not null,
  display_name text null,
  is_anonymous boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  data_source text not null default 'journal' check (data_source in ('journal', 'csv', 'broker')),
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  privacy jsonb not null default '{}'::jsonb,
  certificate_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create index if not exists certificates_user_created_idx on public.certificates (user_id, created_at desc);
create index if not exists certificates_public_id_idx on public.certificates (public_id);
create index if not exists certificates_active_public_idx on public.certificates (public_id) where status = 'active' and visibility = 'public';

alter table public.certificates enable row level security;

-- Users can manage only their own certificates.
drop policy if exists "Users can view own certificates" on public.certificates;
create policy "Users can view own certificates"
  on public.certificates
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own certificates" on public.certificates;
create policy "Users can insert own certificates"
  on public.certificates
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own certificates" on public.certificates;
create policy "Users can update own certificates"
  on public.certificates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public active certificates can be read without login for sharing.
drop policy if exists "Public can view active certificate snapshots" on public.certificates;
create policy "Public can view active certificate snapshots"
  on public.certificates
  for select
  using (visibility = 'public' and status = 'active');
