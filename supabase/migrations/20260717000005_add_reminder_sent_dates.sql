-- Tracks sent dates so reminder cron jobs do not email users repeatedly.

alter table public.profiles
  add column if not exists daily_plan_reminder_sent_on date null,
  add column if not exists weekly_review_reminder_sent_on date null;
