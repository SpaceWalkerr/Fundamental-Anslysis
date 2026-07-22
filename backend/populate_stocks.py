#!/usr/bin/env python3
"""
Populate the `stocks` table with live fundamentals from Yahoo Finance.

No API key required. Covers India (NSE) and the US. Run:

    python populate_stocks.py            # both markets
    python populate_stocks.py india      # one market
    python populate_stocks.py us

Safe to re-run — it upserts on `ticker`. Requires SUPABASE_URL and
SUPABASE_SERVICE_KEY in the environment (.env).
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.stock_pipeline import refresh


if __name__ == "__main__":
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    markets = ("india", "us") if arg in ("all", "both") else (arg,)
    summary = asyncio.run(refresh(markets))
    print("\n" + "=" * 50)
    print("Done:", summary)
    print("The Stock Scanner now runs on live data.")
