-- Tracks whether a user has completed the ProfitPnL setup wizard.
-- Existing users with any journal/account/playbook data are treated as already onboarded.

alter table public.profiles
  add column if not exists onboarding_completed boolean null;

update public.profiles p
set onboarding_completed = true
where onboarding_completed is null
  and (
    exists (select 1 from public.accounts a where a.user_id = p.id)
    or exists (select 1 from public.trades t where t.user_id = p.id)
    or exists (select 1 from public.playbook pb where pb.user_id = p.id)
  );

alter table public.profiles
  alter column onboarding_completed set default false;
