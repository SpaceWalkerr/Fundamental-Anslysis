-- Add a clean `market` dimension to the stocks table so the screener can
-- scope results to a region (india | us). Run once in the Supabase SQL editor.

alter table public.stocks
  add column if not exists market text;

-- Backfill any existing rows from exchange/currency heuristics.
update public.stocks
set market = case
  when market is not null then market
  when ticker like '%.NS' or currency = 'INR' or exchange ilike '%NSE%' or exchange ilike '%BSE%' then 'india'
  else 'us'
end
where market is null;

create index if not exists idx_stocks_market on public.stocks(market);
