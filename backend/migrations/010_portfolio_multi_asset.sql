-- Extend portfolio_holdings to track ANY investment, not just stocks:
-- stocks (any market), gold, cash and other assets — with live or manual pricing.
-- Run once in the Supabase SQL editor (after 007_add_portfolio_tracking.sql).

alter table portfolio_holdings
  add column if not exists asset_type varchar(20) not null default 'stock',  -- stock | gold | cash | other
  add column if not exists manual_price decimal(20, 4),                       -- current price for cash/other (no live feed)
  add column if not exists live_ticker varchar(30),                           -- symbol used to fetch a live price (stocks/gold)
  add column if not exists currency varchar(8) default 'INR';

create index if not exists idx_holdings_asset_type on portfolio_holdings(asset_type);
