-- ProfitPnL affiliate / influencer referral system.
-- Run this migration in Supabase before enabling affiliate dashboards in production.

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  slug text unique not null,
  coupon_code text unique not null,
  discount_percent numeric not null default 20,
  discount_duration_months integer not null default 3,
  commission_percent numeric not null default 30,
  commission_duration_months integer not null default 12,
  status text not null default 'active' check (status in ('active', 'inactive')),
  stripe_coupon_id text null,
  stripe_promotion_code_id text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliates_user_id_idx on public.affiliates (user_id);
create index if not exists affiliates_email_idx on public.affiliates (lower(email));
create index if not exists affiliates_slug_idx on public.affiliates (slug);
create index if not exists affiliates_coupon_code_idx on public.affiliates (coupon_code);

create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid null references public.affiliates(id) on delete set null,
  ref_code text null,
  landing_url text null,
  ip_hash text null,
  user_agent_hash text null,
  created_at timestamptz not null default now()
);

create index if not exists referral_clicks_affiliate_created_idx on public.referral_clicks (affiliate_id, created_at desc);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid null references public.affiliates(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_code text null,
  coupon_code text null,
  source text not null default 'cookie',
  attributed_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists referral_attributions_affiliate_idx on public.referral_attributions (affiliate_id, attributed_at desc);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid null references public.affiliates(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_invoice_id text unique,
  coupon_code text null,
  currency text not null default 'usd',
  gross_amount_cents integer not null,
  commission_amount_cents integer not null,
  commission_percent numeric not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'reversed')),
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  paid_at timestamptz null
);

create index if not exists affiliate_commissions_affiliate_created_idx on public.affiliate_commissions (affiliate_id, created_at desc);
create index if not exists affiliate_commissions_user_idx on public.affiliate_commissions (user_id);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'paid' check (status in ('pending', 'paid', 'cancelled')),
  period_start date null,
  period_end date null,
  paid_at timestamptz null default now(),
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_payouts_affiliate_paid_idx on public.affiliate_payouts (affiliate_id, paid_at desc);

alter table public.affiliates enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payouts enable row level security;

-- Affiliates can view their own affiliate profile if their user_id or email matches.
drop policy if exists "Affiliates can view own profile" on public.affiliates;
create policy "Affiliates can view own profile"
  on public.affiliates
  for select
  using (auth.uid() = user_id or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Users can view their own attribution row.
drop policy if exists "Users can view own attribution" on public.referral_attributions;
create policy "Users can view own attribution"
  on public.referral_attributions
  for select
  using (auth.uid() = user_id);

-- Affiliates can view their own commission rows.
drop policy if exists "Affiliates can view own commissions" on public.affiliate_commissions;
create policy "Affiliates can view own commissions"
  on public.affiliate_commissions
  for select
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_commissions.affiliate_id
      and (a.user_id = auth.uid() or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

-- Affiliates can view their own payout rows.
drop policy if exists "Affiliates can view own payouts" on public.affiliate_payouts;
create policy "Affiliates can view own payouts"
  on public.affiliate_payouts
  for select
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = affiliate_payouts.affiliate_id
      and (a.user_id = auth.uid() or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    )
  );

-- All inserts/updates are intentionally performed by trusted server routes using the service role key.
