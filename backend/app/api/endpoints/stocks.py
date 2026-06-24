"""
Stocks API Endpoints
Handles company search and stock screening
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from supabase import Client
from typing import List, Optional
import asyncio
import logging
import re
import time

from app.db.database import get_db
from app.models.schemas import (
    CompanySearch,
    StockScreenerRequest,
    StockScreenerResponse,
    StockScreenerResult,
    StockDetails,
    StockFilter,
    SaveScreenerRequest,
    WatchlistResponse,
    WatchlistItemResponse,
)
from app.core.security import get_current_active_user
from app.utils.stock_data_service import get_stock_data_service
from app.utils.stock_screener import get_stock_screener

router = APIRouter()
logger = logging.getLogger("app.api.endpoints.stocks")

# In-memory caches with TTL (time-to-live)
_search_cache = {}  # key: (query_string, limit) -> (results, timestamp)
_quote_cache = {}   # key: ticker -> (quote_data, timestamp)
_pending_refreshes = set()

CACHE_TTL = 300  # 5 minutes in seconds
_watchlist_lock = asyncio.Lock()

# Helper mapping for currency symbols
CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "₹",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "CAD": "C$",
    "AUD": "A$",
    "CNY": "¥",
    "HKD": "HK$",
    "SGD": "S$",
    "CHF": "CHF",
}

def _format_market_cap(market_cap, currency: str = "USD") -> str:
    """Format market cap to human-readable string"""
    if market_cap is None or market_cap == "":
        return "N/A"

    currency = (currency or "USD").upper()
    symbol = CURRENCY_SYMBOLS.get(currency, f"{currency} ")

    try:
        # Strip common formatting characters
        cleaned = str(market_cap)
        for char in [',', '$', '₹', '€', '£', '¥']:
            cleaned = cleaned.replace(char, '')
        mc = float(cleaned.strip())
        if mc >= 1_000_000_000_000:
            return f"{symbol}{mc/1_000_000_000_000:.1f}T"
        elif mc >= 1_000_000_000:
            return f"{symbol}{mc/1_000_000_000:.1f}B"
        elif mc >= 1_000_000:
            return f"{symbol}{mc/1_000_000:.1f}M"
        else:
            return f"{symbol}{mc:,.0f}"
    except Exception:
        formatted = str(market_cap)
        # If it already starts with a currency symbol, return it
        for sym in CURRENCY_SYMBOLS.values():
            if formatted.startswith(sym):
                return formatted
        return f"{symbol}{formatted}"


async def _get_or_create_default_watchlist(db: Client, user_id: str) -> str:
    """Return the user's default watchlist id, creating one if needed."""
    async with _watchlist_lock:
        result = db.table('watchlists')\
            .select('id')\
            .eq('user_id', user_id)\
            .eq('is_default', True)\
            .limit(1)\
            .execute()

        if result.data:
            return result.data[0]['id']

        try:
            created = db.table('watchlists').insert({
                "user_id": user_id,
                "name": "My Watchlist",
                "description": "Default watchlist for tracking stocks",
                "is_default": True,
                "color": "#3b82f6",
                "sort_order": 0,
            }).execute()

            if created.data:
                return created.data[0]['id']
        except Exception as e:
            # Fallback in case of concurrent DB insertions from other worker processes
            logger.warning(f"Watchlist insert error (trying fallback): {e}")
            result = db.table('watchlists')\
                .select('id')\
                .eq('user_id', user_id)\
                .eq('is_default', True)\
                .limit(1)\
                .execute()

            if result.data:
                return result.data[0]['id']

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create default watchlist"
        )


async def fetch_quote_cached(ticker: str, stock_service) -> Optional[dict]:
    """Fetch quote using in-memory cache to prevent N+1 API calls"""
    now = time.time()
    if ticker in _quote_cache:
        cached_data, timestamp = _quote_cache[ticker]
        if now - timestamp < CACHE_TTL:
            return cached_data
            
    try:
        q_data = await stock_service.get_quote(ticker)
        if q_data:
            _quote_cache[ticker] = (q_data, now)
        return q_data
    except Exception as e:
        # 5. Structured logging instead of print
        logger.error(f"Error fetching quote for {ticker} during search: {e}", exc_info=True)
        return None


@router.get("/search", response_model=List[CompanySearch])
async def search_companies(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results to return"),
    db: Client = Depends(get_db)
):
    """
    Search for companies by name or ticker symbol
    Returns matching companies from various stock exchanges
    """
    # 1. Clean the query to prevent PostgREST injection (e.g. removing commas, colons, parentheses)
    clean_q = re.sub(r'[^a-zA-Z0-9\s.-]', '', q).strip()
    if len(clean_q) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must contain at least 1 valid alphanumeric character"
        )

    # 15. Check local search cache for throttling
    now = time.time()
    cache_key = (clean_q.lower(), limit)
    if cache_key in _search_cache:
        cached_results, timestamp = _search_cache[cache_key]
        if now - timestamp < 60:  # 1-minute search result cache
            return cached_results

    stock_service = get_stock_data_service()

    try:
        # 23. Pass limit to limit upstream API work
        api_results = await stock_service.search_companies(clean_q, limit=limit)

        # 1. Use sanitized clean_q to prevent query injection
        db_results = db.table('stocks')\
            .select('ticker, name, sector, price, change_percent, market_cap, pe_ratio, revenue_growth, profit_margin, currency')\
            .or_(f"ticker.ilike.%{clean_q}%,name.ilike.%{clean_q}%")\
            .eq('is_active', True)\
            .limit(limit)\
            .execute()

        combined = {}
        tickers_to_query_quotes = []

        # Load db results
        for stock in (db_results.data or []):
            ticker = stock.get('ticker')
            if ticker:
                currency = stock.get('currency') or 'USD'
                change_pct = stock.get('change_percent')
                
                # If change_percent is missing or 0 while price is positive, mark to fetch live
                should_fetch_live = change_pct is None or (float(change_pct) == 0.0 and float(stock.get('price', 0) or 0) > 0)
                
                combined[ticker] = CompanySearch(
                    id=ticker,
                    ticker=ticker,
                    name=stock.get('name', ''),
                    sector=stock.get('sector', '') or 'Equity',
                    price=float(stock.get('price', 0) or 0),
                    change_percent=float(change_pct or 0),
                    pe_ratio=float(stock.get('pe_ratio', 0) or 0) if stock.get('pe_ratio') is not None else None,
                    revenue_growth=float(stock.get('revenue_growth', 0) or 0) if stock.get('revenue_growth') is not None else None,
                    profit_margin=float(stock.get('profit_margin', 0) or 0) if stock.get('profit_margin') is not None else None,
                    market_cap=_format_market_cap(stock.get('market_cap'), currency),
                    currency=currency
                )
                
                if should_fetch_live:
                    tickers_to_query_quotes.append(ticker)

        # Batch check DB for any API results not in the combined list (to avoid fetching quotes from API if we already have them locally)
        missing_tickers = [
            r.get('ticker') for r in api_results 
            if r.get('ticker') and r.get('ticker') not in combined
        ]

        if missing_tickers:
            # Build clean CSV list of ticker symbols for PGREST IN query
            safe_tickers_str = ",".join(re.sub(r'[^a-zA-Z0-9.-]', '', t) for t in missing_tickers)
            if safe_tickers_str:
                db_missing = db.table('stocks')\
                    .select('ticker, name, sector, price, change_percent, market_cap, pe_ratio, revenue_growth, profit_margin, currency')\
                    .filter('ticker', 'in', f"({safe_tickers_str})")\
                    .execute()
                for stock in (db_missing.data or []):
                    ticker = stock.get('ticker')
                    if ticker:
                        currency = stock.get('currency') or 'USD'
                        change_pct = stock.get('change_percent')
                        
                        should_fetch_live = change_pct is None or (float(change_pct) == 0.0 and float(stock.get('price', 0) or 0) > 0)
                        
                        combined[ticker] = CompanySearch(
                            id=ticker,
                            ticker=ticker,
                            name=stock.get('name', ''),
                            sector=stock.get('sector', '') or 'Equity',
                            price=float(stock.get('price', 0) or 0),
                            change_percent=float(change_pct or 0),
                            pe_ratio=float(stock.get('pe_ratio', 0) or 0) if stock.get('pe_ratio') is not None else None,
                            revenue_growth=float(stock.get('revenue_growth', 0) or 0) if stock.get('revenue_growth') is not None else None,
                            profit_margin=float(stock.get('profit_margin', 0) or 0) if stock.get('profit_margin') is not None else None,
                            market_cap=_format_market_cap(stock.get('market_cap'), currency),
                            currency=currency
                        )
                        
                        if should_fetch_live and ticker not in tickers_to_query_quotes:
                            tickers_to_query_quotes.append(ticker)

        # Build list of tickers that are still completely missing quote/price data
        for result in api_results:
            ticker = result.get('ticker')
            if ticker and ticker not in combined:
                currency = result.get('currency') or 'USD'
                combined[ticker] = CompanySearch(
                    id=ticker,
                    ticker=ticker,
                    name=result.get('name', ''),
                    sector=result.get('sector', '') or 'Equity',
                    price=0.0,
                    change_percent=0.0,
                    pe_ratio=None,
                    revenue_growth=None,
                    profit_margin=None,
                    market_cap="",
                    currency=currency
                )
                tickers_to_query_quotes.append(ticker)

        # 2. Limit the number of parallel API requests to prevent rate limit hits and slow searches
        # Also uses in-memory cache to prevent N+1 queries.
        if tickers_to_query_quotes:
            # Query at most the top 3 missing quotes to prevent hitting limits
            throttled_tickers = tickers_to_query_quotes[:3]
            quotes_results = await asyncio.gather(*(fetch_quote_cached(t, stock_service) for t in throttled_tickers))
            for t, quote in zip(throttled_tickers, quotes_results):
                if quote and t in combined:
                    currency = quote.get('currency') or combined[t].currency or 'USD'
                    combined[t].currency = currency
                    combined[t].price = float(quote.get('price', 0) or 0)
                    combined[t].change_percent = float(quote.get('change_percent', 0) or 0)
                    combined[t].market_cap = _format_market_cap(quote.get('market_cap'), currency)

                    if quote.get('pe_ratio') is not None:
                        combined[t].pe_ratio = float(quote.get('pe_ratio') or 0)
                    if quote.get('revenue_growth') is not None:
                        combined[t].revenue_growth = float(quote.get('revenue_growth') or 0)
                    if quote.get('profit_margin') is not None:
                        combined[t].profit_margin = float(quote.get('profit_margin') or 0)
                        
                    # Save to DB so subsequent requests don't hit the rate limit!
                    try:
                        from datetime import datetime
                        db.table('stocks').update({
                            "price": combined[t].price,
                            "change_percent": combined[t].change_percent,
                            "last_updated": datetime.utcnow().isoformat()
                        }).eq('ticker', t).execute()
                    except Exception as db_err:
                        logger.warning(f"Failed to update stock price/change in DB for {t}: {db_err}")

        # Filter: Only keep India and US stocks (excluding options, ETFs, and cryptos)
        filtered_results = []
        for item in combined.values():
            ticker_upper = item.ticker.upper()
            
            # Exclude cryptos (e.g., BTC-USD)
            if "-" in ticker_upper and any(ticker_upper.endswith(suffix) for suffix in ["-USD", "-EUR", "-INR"]):
                continue
                
            # Exclude option symbols
            if re.match(r'^[A-Z]{1,6}\d{6}[CP]\d{8}$', ticker_upper):
                continue
                
            is_indian = ticker_upper.endswith(".NS") or ticker_upper.endswith(".BO")
            is_us = False
            
            if not is_indian:
                if "." in ticker_upper:
                    parts = ticker_upper.split('.')
                    # Allow US stock classes (e.g. BRK.A) but exclude foreign suffixes (.MX, .NE, etc.)
                    is_us = len(parts[-1]) == 1
                else:
                    is_us = True
            
            if is_indian or is_us:
                sector_upper = (item.sector or "").upper()
                name_upper = (item.name or "").upper()
                
                # Exclude ETFs and Options based on name or sector
                if "ETF" in sector_upper or "ETF" in name_upper or "TRUST" in name_upper:
                    continue
                if "OPTION" in sector_upper or "OPTION" in name_upper:
                    continue
                    
                filtered_results.append(item)

        # Prioritize Indian stocks first, then US stocks
        indian_stocks = [item for item in filtered_results if item.ticker.upper().endswith(".NS") or item.ticker.upper().endswith(".BO")]
        us_stocks = [item for item in filtered_results if not (item.ticker.upper().endswith(".NS") or item.ticker.upper().endswith(".BO"))]
        
        sorted_results = indian_stocks + us_stocks
        results = sorted_results[:limit]
        
        _search_cache[cache_key] = (results, now)
        return results

    except HTTPException:
        raise
    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Search endpoint failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the search query."
        )


@router.post("/screener", response_model=StockScreenerResponse)
async def run_stock_screener(
    request: StockScreenerRequest,
    db: Client = Depends(get_db)
):
    """
    Run stock screener with custom filters
    Filter stocks based on financial metrics and fundamentals
    """
    screener = get_stock_screener(db)

    try:
        filters_dict = [
            {
                "field": f.field,
                "operator": f.operator,
                "value": f.value
            }
            for f in request.filters
        ]

        results = screener.screen_stocks(
            filters=filters_dict,
            sort_by=request.sort_by if hasattr(request, 'sort_by') else "market_cap",
            sort_order=request.sort_order if hasattr(request, 'sort_order') else "desc",
            limit=request.limit if hasattr(request, 'limit') else 100
        )

        stock_results = []
        for stock in results.get('results', []):
            stock_results.append(StockScreenerResult(
                ticker=stock.get('ticker', ''),
                company=stock.get('name', ''),
                sector=stock.get('sector', ''),
                price=float(stock.get('price', 0) or 0),
                market_cap=_format_market_cap(stock.get('market_cap'), stock.get('currency', 'USD')),
                pe_ratio=float(stock.get('pe_ratio', 0) or 0),
                revenue_growth=float(stock.get('revenue_growth', 0) or 0),
                profit_margin=float(stock.get('profit_margin', 0) or 0),
                match_score=int(stock.get('match_score', 0))
            ))

        return StockScreenerResponse(
            total=results.get('total_count', 0),
            results=stock_results,
            filters_applied=request.filters
        )

    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Stock screener failure: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while running the stock screener."
        )


@router.get("/details/{ticker}", response_model=StockDetails)
async def get_stock_details(
    ticker: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get detailed stock information
    Fetches from cache or API if needed
    """
    # 25. Validate ticker format before querying
    ticker_upper = ticker.upper().strip()
    if not re.match(r'^[A-Z0-9.-]{1,20}$', ticker_upper):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticker symbol format."
        )

    # 3. Don't swallow critical DB errors with pass, log them and fall back properly.
    try:
        result = db.table('stocks')\
            .select('*')\
            .eq('ticker', ticker_upper)\
            .eq('is_active', True)\
            .single()\
            .execute()

        if result.data:
            stock = result.data

            from datetime import datetime, timedelta
            last_updated = datetime.fromisoformat(stock['last_updated'].replace('Z', '+00:00'))
            if datetime.now(last_updated.tzinfo) - last_updated > timedelta(hours=1):
                # 24. Background refresh lock mechanism to prevent duplicate runs
                if ticker_upper not in _pending_refreshes:
                    _pending_refreshes.add(ticker_upper)
                    background_tasks.add_task(refresh_stock_data, ticker_upper, db)

            # 12. Pydantic StockDetails automatically handles validation and limits output fields
            return stock
    except Exception as e:
        # Log database details for debugging, but still allow fallback to the API
        logger.warning(f"Database lookup for stock '{ticker_upper}' failed: {e}. Falling back to API.")

    stock_service = get_stock_data_service()

    try:
        overview = await stock_service.get_company_overview(ticker_upper)

        if not overview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock '{ticker_upper}' not found."
            )

        db.table('stocks').upsert(
            overview,
            on_conflict='ticker'
        ).execute()

        return overview

    except HTTPException:
        raise
    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Details retrieval failed for '{ticker_upper}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve stock details due to an internal server error."
        )


@router.get("/screener/presets")
async def get_screening_presets(
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get predefined screening presets
    Returns common stock screens like "Growth Stocks", "Value Stocks", etc.
    """
    screener = get_stock_screener(db)
    return {"presets": screener.get_screening_presets()}


@router.post("/screener/save")
async def save_custom_screen(
    request: SaveScreenerRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Save a custom screening configuration
    """
    try:
        # 16. Request schema validation enables type safety
        filters_dict = [
            {
                "field": f.field,
                "operator": f.operator.value if hasattr(f.operator, 'value') else f.operator,
                "value": f.value
            }
            for f in request.filters
        ]

        screen_data = {
            "user_id": current_user['id'],
            "name": request.name,
            "description": request.description,
            "filters": filters_dict,
            "is_public": request.is_public
        }

        result = db.table('saved_screens').insert(screen_data).execute()

        return {
            "success": True,
            "screen_id": result.data[0]['id'] if result.data else None,
            "message": "Screen saved successfully."
        }
    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Save custom screen failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save custom screener configuration."
        )


@router.get("/screener/saved")
async def get_saved_screens(
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get user's saved custom screens
    """
    try:
        # 21. Pagination support for large datasets
        result = db.table('saved_screens')\
            .select('*')\
            .eq('user_id', current_user['id'])\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        return {"saved_screens": result.data or []}
    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Fetch saved screens failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch saved screener configurations."
        )


@router.post("/watchlist/add")
async def add_to_watchlist(
    ticker: str,
    notes: Optional[str] = None,
    target_price: Optional[float] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Add a stock to user's watchlist
    """
    # 25. Validate ticker format
    ticker_upper = ticker.upper().strip()
    if not re.match(r'^[A-Z0-9.-]{1,20}$', ticker_upper):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticker symbol format."
        )

    # 17. Verify whether the ticker exists in the database or externally
    db_check = db.table('stocks')\
        .select('ticker')\
        .eq('ticker', ticker_upper)\
        .eq('is_active', True)\
        .execute()

    if not db_check.data:
        stock_service = get_stock_data_service()
        try:
            overview = await stock_service.get_company_overview(ticker_upper)
            if not overview:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stock ticker '{ticker_upper}' does not exist."
                )
            # Cache the valid ticker metadata in local DB
            db.table('stocks').upsert(overview, on_conflict='ticker').execute()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Verification failed for '{ticker_upper}': {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not verify existence of ticker '{ticker_upper}'."
            )

    try:
        watchlist_id = await _get_or_create_default_watchlist(db, current_user['id'])
        watchlist_data = {
            "watchlist_id": watchlist_id,
            "ticker": ticker_upper,
            "notes": notes,
            "target_price": target_price
        }

        db.table('watchlist_items').upsert(
            watchlist_data,
            on_conflict='watchlist_id,ticker'
        ).execute()

        return {
            "success": True,
            "message": f"{ticker_upper} added to watchlist."
        }
    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Watchlist insertion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add stock to watchlist."
        )


@router.get("/watchlist", response_model=WatchlistResponse)
async def get_watchlist(
    limit: int = Query(50, ge=1, le=100, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get user's watchlist with current prices
    """
    try:
        watchlist_id = await _get_or_create_default_watchlist(db, current_user['id'])
        
        # 19. Retrieve stored items joined with current prices from stocks table
        # 21. Pagination support
        result = db.table('watchlist_items')\
            .select('*, stocks(price, change_percent, name, currency)')\
            .eq('watchlist_id', watchlist_id)\
            .order('added_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        watchlist_items = []
        for item in (result.data or []):
            stock_info = item.get('stocks') or {}
            if isinstance(stock_info, list):
                stock_info = stock_info[0] if stock_info else {}

            watchlist_items.append(WatchlistItemResponse(
                watchlist_id=item.get("watchlist_id"),
                ticker=item.get("ticker"),
                notes=item.get("notes"),
                target_price=item.get("target_price"),
                added_at=item.get("added_at"),
                name=stock_info.get("name") or item.get("ticker"),
                price=stock_info.get("price"),
                change_percent=stock_info.get("change_percent"),
                currency=stock_info.get("currency") or "USD",
            ))

        return WatchlistResponse(watchlist=watchlist_items)

    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Get watchlist failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch watchlist with current prices."
        )


@router.delete("/watchlist/{ticker}")
async def remove_from_watchlist(
    ticker: str,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Remove a stock from user's watchlist
    """
    ticker_upper = ticker.upper().strip()
    if not re.match(r'^[A-Z0-9.-]{1,20}$', ticker_upper):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticker symbol format."
        )

    try:
        watchlist_id = await _get_or_create_default_watchlist(db, current_user['id'])
        result = db.table('watchlist_items')\
            .delete()\
            .eq('watchlist_id', watchlist_id)\
            .eq('ticker', ticker_upper)\
            .execute()

        # 18. Return 404 if ticker was never in the watchlist
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ticker '{ticker_upper}' was not found in your watchlist."
            )

        return {
            "success": True,
            "message": f"{ticker_upper} removed from watchlist."
        }
    except HTTPException:
        raise
    except Exception as e:
        # 20. Do not expose internal raw details
        logger.error(f"Remove from watchlist failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove stock from watchlist."
        )


# Helper functions
async def refresh_stock_data(ticker: str, db: Client):
    """Background task to refresh stock data"""
    stock_service = get_stock_data_service()
    try:
        overview = await stock_service.get_company_overview(ticker)
        if overview:
            db.table('stocks').upsert(
                overview,
                on_conflict='ticker'
            ).execute()
    except Exception as e:
        # 4. Use structured logging instead of print
        logger.error(f"Error refreshing {ticker} in background: {e}", exc_info=True)
    finally:
        # 24. Release background refresh lock
        _pending_refreshes.discard(ticker)
