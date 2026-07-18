-- Weekly Review reminder schedule settings.

alter table public.profiles
  add column if not exists weekly_review_reminder_day text not null default 'Fri',
  add column if not exists weekly_review_reminder_time text not null default '17:00';
