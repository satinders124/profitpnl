-- Saved AI report history for reusable AI insights across ProfitPnL modules.

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null,
  source_page text null,
  context_hash text null,
  title text not null,
  summary text not null,
  bullets jsonb not null default '[]'::jsonb,
  action text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_reports_user_created_idx on public.ai_reports (user_id, created_at desc);
create index if not exists ai_reports_user_type_idx on public.ai_reports (user_id, report_type, created_at desc);
create index if not exists ai_reports_context_hash_idx on public.ai_reports (user_id, context_hash);

alter table public.ai_reports enable row level security;

drop policy if exists "Users can manage own AI reports" on public.ai_reports;
create policy "Users can manage own AI reports"
  on public.ai_reports
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
