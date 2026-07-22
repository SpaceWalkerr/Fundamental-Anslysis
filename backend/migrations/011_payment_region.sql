-- Record the region (IN|US|GB|EU|AE|SG|GLOBAL) a payment was made from, so
-- pricing/analytics can see which regional catalogue each charge came from.
-- The currency is already stored; region is the human-facing bucket.
-- Run once in the Supabase SQL editor (after the payment tables exist).

alter table pro_payments
  add column if not exists region varchar(10);

alter table token_pack_purchases
  add column if not exists region varchar(10);
