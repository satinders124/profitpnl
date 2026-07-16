-- Migration SQL to add 'tradingview_username' field to the profiles table
-- to support clean Method A: invite-only indicator delivery.

alter table public.profiles 
  add column if not exists tradingview_username text null;
