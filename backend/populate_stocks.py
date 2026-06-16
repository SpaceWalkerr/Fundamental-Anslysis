#!/usr/bin/env python3
"""
Populate Stock Database Script
Fetches data for popular stocks and saves to database
"""
import asyncio
import sys
import os
import httpx
import csv
import io
import time
import re
import logging
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

# Set the current working directory to backend folder and load its .env file explicitly
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

# Load the env variables from the correct .env file
from dotenv import load_dotenv
dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path, override=True)

# Add parent directory to path
sys.path.insert(0, backend_dir)

from app.utils.stock_data_service import get_stock_data_service, YahooFinanceRateLimitError
from app.db.database import get_supabase_admin_client

# Set up logging
logger = logging.getLogger("populate_stocks")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class TokenBucket:
    """Token Bucket rate limiter for asyncio requests"""
    def __init__(self, capacity: int, fill_rate: float):
        self.capacity = float(capacity)
        self._tokens = float(capacity)
        self.fill_rate = float(fill_rate)
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def consume(self, tokens: float = 1.0):
        async with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self.last_update
                self.last_update = now
                self._tokens = min(self.capacity, self._tokens + (elapsed * self.fill_rate))
                
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return
                
                needed = tokens - self._tokens
                sleep_time = needed / self.fill_rate
                await asyncio.sleep(sleep_time)

# Fallback Indian stocks list in case the NSE CSV download fails
FALLBACK_STOCKS = [
    # Large Cap - Technology & IT
    "TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS",
    "LTI.NS", "COFORGE.NS", "PERSISTENT.NS", "MPHASIS.NS",
    # Large Cap - Banking & Finance
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS",
    "BAJFINANCE.NS", "BAJAJFSV.NS", "INDUSINDBK.NS", "ICICIGI.NS", "HDFCLIFE.NS",
    # Large Cap - Energy & Oil
    "RELIANCE.NS", "ONGC.NS", "BPCL.NS", "IOC.NS", "GAIL.NS",
    "ADANIGREEN.NS", "ADANIPOWER.NS", "TATAPOWER.NS", "NTPC.NS", "POWERGRID.NS",
    # Large Cap - FMCG & Consumer
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "DABUR.NS",
    "GODREJCP.NS", "MARICO.NS", "TATACONSUM.NS", "COLPAL.NS",
    # Large Cap - Pharma & Healthcare
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "BIOCON.NS",
    "AUROPHARMA.NS", "LUPIN.NS", "TORNTPHARM.NS", "APOLLOHOSP.NS",
    # Large Cap - Auto & Manufacturing
    "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS", "EICHERMOT.NS",
    "HEROMOTOCO.NS", "ASHOKLEY.NS", "TVSMOTOR.NS", "BHARATFORG.NS",
    # Large Cap - Metals & Mining
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS", "COALINDIA.NS",
    "SAIL.NS", "NMDC.NS", "JINDALSTEL.NS",
    # Large Cap - Infrastructure & Cement
    "LT.NS", "ULTRACEMCO.NS", "GRASIM.NS", "AMBUJACEM.NS", "ACC.NS",
    "ADANIPORTS.NS", "DLF.NS", "GODREJPROP.NS",
    # Large Cap - Telecom & Media
    "BHARTIARTL.NS", "ZEEL.NS", "SUNTV.NS",
]

async def fetch_all_nse_tickers() -> List[str]:
    """Dynamically fetch the list of all listed companies on the National Stock Exchange (NSE)"""
    url = "https://archives.nseindia.com/content/historical/EQUITIES/common/EQUITY_L.csv"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=15.0)
            if response.status_code == 200:
                content = response.text
                f = io.StringIO(content)
                reader = csv.reader(f)
                header = next(reader)
                
                # Find the symbol column
                symbol_idx = -1
                for idx, col in enumerate(header):
                    if col.strip().upper() == "SYMBOL":
                        symbol_idx = idx
                        break
                
                if symbol_idx != -1:
                    tickers = []
                    for row in reader:
                        if row and len(row) > symbol_idx:
                            sym = row[symbol_idx].strip()
                            if sym and sym != "SYMBOL" and re.match(r'^[A-Z0-9&-]+$', sym):
                                tickers.append(f"{sym}.NS")
                    if tickers:
                        logger.info(f"Dynamically fetched {len(tickers)} symbols from NSE.")
                        return tickers
    except Exception as e:
        logger.error(f"Error dynamically loading NSE equities list: {e}")
    
    logger.info(f"Falling back to pre-defined list of {len(FALLBACK_STOCKS)} popular stocks.")
    return FALLBACK_STOCKS

async def get_existing_stocks_map(db) -> Dict[str, datetime]:
    """Fetch existing stocks from the database to check when they were last updated"""
    try:
        res = db.table('stocks').select('ticker, last_updated').execute()
        if res.data:
            stocks_map = {}
            for item in res.data:
                ticker = item.get('ticker')
                last_updated_str = item.get('last_updated')
                if ticker and last_updated_str:
                    try:
                        dt_str = last_updated_str.replace('Z', '+00:00')
                        stocks_map[ticker.upper()] = datetime.fromisoformat(dt_str)
                    except Exception:
                        pass
            return stocks_map
    except Exception as e:
        logger.error(f"Error fetching existing stocks map: {e}")
    return {}

async def run_population(db=None):
    """
    Fetch and save stock data with Token Bucket rate limiting, random jitter,
    batch cooldowns, and incremental updates (skipping recently updated stocks).
    """
    logger.info("=" * 60)
    logger.info("Stock Database Population Script - Indian Markets (NSE)")
    logger.info("=" * 60)

    # Dynamic download of ALL companies listed on NSE
    tickers = await fetch_all_nse_tickers()
    
    # Initialize services
    stock_service = get_stock_data_service()
    if db is None:
        db = get_supabase_admin_client()
        
    logger.info("Fetching existing stocks to check for incremental updates...")
    existing_stocks = await get_existing_stocks_map(db)
    
    now_utc = datetime.now(timezone.utc)
    skip_threshold = timedelta(hours=12)
    
    filtered_tickers = []
    skipped_tickers = []
    
    for ticker in tickers:
        t_upper = ticker.upper()
        if t_upper in existing_stocks:
            last_updated = existing_stocks[t_upper]
            if last_updated.tzinfo is None:
                last_updated = last_updated.replace(tzinfo=timezone.utc)
            else:
                last_updated = last_updated.astimezone(timezone.utc)
            
            if now_utc - last_updated < skip_threshold:
                skipped_tickers.append(ticker)
                continue
        filtered_tickers.append(ticker)
        
    if skipped_tickers:
        logger.info(f"⏭️ Skipping {len(skipped_tickers)} tickers updated in the last 12 hours.")
        
    logger.info(f"Populating database for {len(filtered_tickers)} tickers...")
    
    success_count = 0
    error_count = 0
    consecutive_rate_limits = 0
    
    # Rate Limiting: Token Bucket
    # Capacity = 3, Fill Rate = 0.4 tokens/sec (pacing layer)
    rate_limiter = TokenBucket(capacity=3, fill_rate=0.4)
    
    for i, ticker in enumerate(filtered_tickers, 1):
        try:
            # Consume 1 rate token
            await rate_limiter.consume(1.0)
            
            # 1. Randomized Jitter: Delay 2.5 to 5.5 seconds to make requests look human
            jitter = random.uniform(2.5, 5.5)
            await asyncio.sleep(jitter)
            
            # 2. Batch Cooldown: Every 15 requests, pause for 20 to 40 seconds
            if i > 1 and i % 15 == 0:
                batch_cooldown = random.uniform(20.0, 40.0)
                logger.info(f"Taking a batch cooldown break for {batch_cooldown:.1f} seconds...")
                await asyncio.sleep(batch_cooldown)
            
            logger.info(f"[{i}/{len(filtered_tickers)}] Fetching {ticker}...")
            
            # Fetch all 17 fields via Yahoo Finance company overview
            overview = await stock_service.get_company_overview(ticker)
            
            if overview:
                # Upsert into stocks table
                db.table('stocks').upsert(overview, on_conflict='ticker').execute()
                logger.info(f"  ✓ Saved {overview.get('name', ticker)}")
                success_count += 1
                consecutive_rate_limits = 0  # Reset on success
            else:
                logger.warning(f"  ✗ No overview data returned for {ticker}")
                error_count += 1
                
        except YahooFinanceRateLimitError as rf_err:
            consecutive_rate_limits += 1
            error_count += 1
            logger.warning(f"  ✗ Yahoo Finance rate limit hit on {ticker}: {rf_err}")
            
            if consecutive_rate_limits == 1:
                cooldown_time = 300  # 5 minutes
                logger.warning(f"  [Rate Limit Tier 1] Sleeping for 5 minutes (300s) to cool down...")
                await asyncio.sleep(cooldown_time)
            elif consecutive_rate_limits == 2:
                cooldown_time = 900  # 15 minutes
                logger.warning(f"  [Rate Limit Tier 2] Sleeping for 15 minutes (900s) to cool down...")
                await asyncio.sleep(cooldown_time)
            else:
                logger.error(f"  [Rate Limit Tier 3] Hit rate limit {consecutive_rate_limits} times consecutively. Exiting population to protect IP address.")
                break
                
        except Exception as e:
            error_msg = str(e)
            if "Rate limited" in error_msg or "Too Many Requests" in error_msg or "RateLimit" in type(e).__name__:
                consecutive_rate_limits += 1
                error_count += 1
                logger.warning(f"  ✗ Rate limited on {ticker}: {e}")
                
                if consecutive_rate_limits == 1:
                    cooldown_time = 300
                    logger.warning(f"  [Rate Limit Tier 1] Sleeping for 5 minutes (300s) to cool down...")
                    await asyncio.sleep(cooldown_time)
                elif consecutive_rate_limits == 2:
                    cooldown_time = 900
                    logger.warning(f"  [Rate Limit Tier 2] Sleeping for 15 minutes (900s) to cool down...")
                    await asyncio.sleep(cooldown_time)
                else:
                    logger.error(f"  [Rate Limit Tier 3] Hit rate limit consecutively. Exiting population to protect IP address.")
                    break
            else:
                logger.error(f"  ✗ Error for {ticker}: {e}")
                error_count += 1
            
        # Status log every 50 tickers
        if i % 50 == 0:
            logger.info(f"Population Progress: {success_count} successful, {error_count} errors.")
            
    logger.info("=" * 60)
    logger.info("DATABASE POPULATION SUMMARY")
    logger.info("=" * 60)
    logger.info(f"✓ Successful: {success_count}")
    logger.info(f"✗ Failed: {error_count}")
    logger.info(f"📊 Total processed: {i if filtered_tickers else 0}")
    logger.info(f"⏭️ Incremental Skip: {len(skipped_tickers)}")
    logger.info("=" * 60)

async def test_api_connection() -> bool:
    """Test API connection before running population"""
    logger.info("Testing Yahoo Finance connection...")
    stock_service = get_stock_data_service()
    try:
        result = await stock_service.get_company_overview("TCS.NS")
        if result:
            logger.info(f"✓ Yahoo Finance test connection successful! Price: {result.get('price')}")
            return True
    except YahooFinanceRateLimitError as e:
        logger.error(f"✗ API test failed: Rate limited. {e}")
    except Exception as e:
        logger.error(f"✗ API test failed: {e}")
    return False

async def main():
    """Main CLI entrypoint"""
    if not await test_api_connection():
        logger.warning("Yahoo Finance connection test failed (your IP might be temporarily rate limited).")
        response = input("Do you want to proceed with database population anyway? (y/n): ")
        if response.lower() != 'y':
            logger.info("Exiting.")
            return
    else:
        print("WARNING: This script will populate data for ALL NSE stocks in your database.")
        response = input("Proceed? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            return
        
    await run_population()

if __name__ == "__main__":
    asyncio.run(main())
