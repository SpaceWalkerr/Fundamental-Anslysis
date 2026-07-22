"""
Live stock data pipeline (Yahoo Finance, no API key).

Fetches fundamentals for a curated India + US universe and upserts them into
the Supabase `stocks` table, tagged with `market`. Used by both the
populate_stocks.py CLI and the admin refresh endpoint.
"""
import asyncio
from typing import List

from app.utils.stock_data_service import get_stock_data_service
from app.db.database import get_supabase_admin_client

INDIA_TICKERS: List[str] = [
    "TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS", "LTIM.NS", "PERSISTENT.NS",
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS", "BAJFINANCE.NS",
    "RELIANCE.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "TATAPOWER.NS", "COALINDIA.NS",
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "DABUR.NS", "MARICO.NS", "TATACONSUM.NS",
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "APOLLOHOSP.NS",
    "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS", "EICHERMOT.NS", "HEROMOTOCO.NS",
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS",
    "LT.NS", "ULTRACEMCO.NS", "GRASIM.NS", "ADANIPORTS.NS", "DLF.NS",
    "BHARTIARTL.NS", "ADANIENT.NS", "HAVELLS.NS", "PIDILITIND.NS", "ASIANPAINT.NS", "TITAN.NS",
]

US_TICKERS: List[str] = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "ADBE",
    "CRM", "AMD", "INTC", "CSCO", "QCOM", "TXN", "IBM", "NOW", "INTU", "AMAT",
    "JPM", "BAC", "WFC", "GS", "MS", "V", "MA", "AXP", "BLK", "SCHW",
    "JNJ", "UNH", "LLY", "PFE", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY",
    "WMT", "PG", "KO", "PEP", "COST", "MCD", "NKE", "HD", "SBUX", "DIS",
    "XOM", "CVX", "COP", "CAT", "BA", "GE", "HON", "UPS", "LMT",
]


def _normalise(overview: dict, raw_ticker: str, market: str) -> dict:
    display = raw_ticker[:-3] if raw_ticker.upper().endswith(".NS") else raw_ticker
    overview["ticker"] = display
    overview["market"] = market
    overview.setdefault("currency", "INR" if market == "india" else "USD")
    overview["is_active"] = True
    overview["data_source"] = "yfinance"
    return overview


async def _populate(tickers, market, service, db, log=print):
    ok = err = 0
    for i, raw in enumerate(tickers, 1):
        try:
            overview = await service.get_company_overview(raw)
            if overview and overview.get("name"):
                db.table("stocks").upsert(_normalise(overview, raw, market), on_conflict="ticker").execute()
                ok += 1
                log(f"[{market}] [{i}/{len(tickers)}] OK {overview.get('name')}")
            else:
                err += 1
                log(f"[{market}] [{i}/{len(tickers)}] no data for {raw}")
        except Exception as e:
            err += 1
            log(f"[{market}] [{i}/{len(tickers)}] error {raw}: {str(e)[:60]}")
        await asyncio.sleep(0.4)  # be gentle with Yahoo
    return ok, err


async def refresh(markets=("india", "us"), log=print) -> dict:
    service = get_stock_data_service()
    db = get_supabase_admin_client()  # service role: bypass RLS for the write
    result = {}
    if "india" in markets:
        ok, err = await _populate(INDIA_TICKERS, "india", service, db, log)
        result["india"] = {"saved": ok, "errors": err}
    if "us" in markets:
        ok, err = await _populate(US_TICKERS, "us", service, db, log)
        result["us"] = {"saved": ok, "errors": err}
    return result


class StockRefreshScheduler:
    """
    Background scheduler that periodically refreshes the `stocks` table from
    Yahoo Finance. Mirrors the app's other lifespan services (start/stop).
    Interval + enablement are controlled via settings so production can turn
    it on without code changes.
    """

    def __init__(self, interval_hours: int = 24, run_on_startup: bool = False):
        self.interval_seconds = max(1, int(interval_hours)) * 3600
        self.run_on_startup = run_on_startup
        self._task = None
        self._stop = None

    async def _loop(self):
        # Optional immediate refresh on boot.
        if self.run_on_startup:
            await self._run_once()
        while not self._stop.is_set():
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self.interval_seconds)
            except asyncio.TimeoutError:
                await self._run_once()  # interval elapsed
            else:
                break  # stop requested

    async def _run_once(self):
        try:
            print("[stock refresh] scheduled run starting…")
            summary = await refresh(("india", "us"))
            print(f"[stock refresh] scheduled run done: {summary}")
        except Exception as e:  # pragma: no cover
            print(f"[stock refresh] scheduled run failed: {e}")

    async def start(self):
        self._stop = asyncio.Event()
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        if self._stop:
            self._stop.set()
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                self._task.cancel()
