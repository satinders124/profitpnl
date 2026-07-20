-- Flexible position sizing field for futures contracts, forex lots, crypto units, etc.
-- Stored as text because traders may use values like "2 contracts", "0.50 lots", "4 micros", or "25k units".

alter table public.trades
  add column if not exists position_size text null;
