-- Email delivery audit trail for Daily Plan reminders, Weekly Reports,
-- admin test sends, broadcasts, and future lifecycle emails.
-- This gives the team a production answer to: sent, skipped, failed, and why.

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  recipient_email text null,
  event_type text not null,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  reason text null,
  provider text not null default 'sendgrid',
  provider_message text null,
  source text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_events_created_at_idx on public.email_events (created_at desc);
create index if not exists email_events_user_created_idx on public.email_events (user_id, created_at desc);
create index if not exists email_events_type_status_idx on public.email_events (event_type, status, created_at desc);

alter table public.email_events enable row level security;

drop policy if exists "Users can view own email events" on public.email_events;
create policy "Users can view own email events"
  on public.email_events
  for select
  using (auth.uid() = user_id);
