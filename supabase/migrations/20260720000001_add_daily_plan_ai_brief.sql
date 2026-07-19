-- Stores the generated AI pre-market briefing on the daily plan itself.
-- This makes Daily Plan generated paragraphs survive tab reloads, device changes,
-- and mobile/PWA background refreshes instead of living only in React state.

alter table public.daily_plans
  add column if not exists ai_title text null,
  add column if not exists ai_summary text null,
  add column if not exists ai_bullets jsonb not null default '[]'::jsonb,
  add column if not exists ai_action text null,
  add column if not exists ai_generated_at timestamptz null;
