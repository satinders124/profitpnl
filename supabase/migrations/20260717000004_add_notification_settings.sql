-- Notification preferences for Daily Plan and Weekly Review reminders.

alter table public.profiles
  add column if not exists daily_plan_reminders_enabled boolean not null default true,
  add column if not exists daily_plan_reminder_time text not null default '08:00',
  add column if not exists weekly_review_reminders_enabled boolean not null default true,
  add column if not exists email_reports_enabled boolean not null default true;
