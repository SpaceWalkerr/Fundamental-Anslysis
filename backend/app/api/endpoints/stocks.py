"""
Stocks API Endpoints
Handles company search and stock screening
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from supabase import Client
from typing import List, Optional
import asyncio

from app.db.database import get_db
from app.models.schemas import (
    CompanySearch,
    StockScreenerRequest,
    StockScreenerResponse,
    StockScreenerResult,
)
from app.core.security import get_current_active_user, require_premium
from app.utils.stock_data_service import get_stock_data_service
from app.utils.stock_screener import get_stock_screener


router = APIRouter()


# Mock company data
MOCK_COMPANIES = [
    {
        "id": "1",
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "sector": "Technology",
        "price": 225.50,
        "change_percent": 2.5,
        "pe_ratio": 28.5,
        "revenue_growth": 2.8,
        "profit_margin": 25.5,
        "market_cap": "$2.8T",
    },
    {
        "id": "2",
        "name": "Microsoft Corporation",
        "ticker": "MSFT",
        "sector": "Technology",
        "price": 415.25,
        "change_percent": 1.8,
        "pe_ratio": 28.5,
        "revenue_growth": 16.2,
        "profit_margin": 35.8,
        "market_cap": "$3.1T",
    },
    {
        "id": "3",
        "name": "NVIDIA Corporation",
        "ticker": "NVDA",
        "sector": "Technology",
        "price": 880.25,
        "change_percent": 3.2,
        "pe_ratio": 65.2,
        "revenue_growth": 126.0,
        "profit_margin": 52.1,
        "market_cap": "$2.2T",
    },
    {
        "id": "4",
        "name": "Alphabet Inc.",
        "ticker": "GOOGL",
        "sector": "Technology",
        "price": 178.90,
        "change_percent": -0.5,
        "pe_ratio": 22.5,
        "revenue_growth": 11.0,
        "profit_margin": 24.0,
        "market_cap": "$2.2T",
    },
    {
        "id": "5",
        "name": "Amazon.com Inc.",
        "ticker": "AMZN",
        "sector": "Consumer Discretionary",
        "price": 195.80,
        "change_percent": 2.1,
        "pe_ratio": 42.3,
        "revenue_growth": 10.5,
        "profit_margin": 3.2,
        "market_cap": "$2.0T",
    },
    {
        "id": "6",
        "name": "Tesla Inc.",
        "ticker": "TSLA",
        "sector": "Industrials",
        "price": 285.20,
        "change_percent": -1.2,
        "pe_ratio": 35.8,
        "revenue_growth": 1.8,
        "profit_margin": 10.5,
        "market_cap": "$900B",
    },
]


@router.get("/search", response_model=List[CompanySearch])
async def search_companies(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Search for companies by name or ticker symbol
    Returns matching companies from various stock exchanges
    """
    if len(q) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must be at least 1 character"
        )
    
    # Get stock data service
    stock_service = get_stock_data_service()
    
    # Search companies via API
    try:
        api_results = await stock_service.search_companies(q)
        
        # Also search local database for cached stocks with full metrics
        db_results = db.table('stocks')\
            .select('ticker, name, sector, price, change_percent, market_cap, pe_ratio, revenue_growth, profit_margin, currency')\
            .or_(f"ticker.ilike.%{q}%,name.ilike.%{q}%")\
            .eq('is_active', True)\
            .limit(10)\
            .execute()
        
        # Combine and deduplicate results
        combined = {}
        
        # 1. Add local database cached results (which have cached metrics)
        for stock in (db_results.data or []):
            ticker = stock.get('ticker')
            if ticker:
                currency = stock.get('currency') or 'USD'
                combined[ticker] = CompanySearch(
                    id=ticker,
                    ticker=ticker,
                    name=stock.get('name', ''),
                    sector=stock.get('sector', '') or 'Equity',
                    price=float(stock.get('price', 0) or 0),
                    change_percent=float(stock.get('change_percent', 0) or 0),
                    pe_ratio=float(stock.get('pe_ratio', 0) or 0) if stock.get('pe_ratio') is not None else None,
                    revenue_growth=float(stock.get('revenue_growth', 0) or 0) if stock.get('revenue_growth') is not None else None,
                    profit_margin=float(stock.get('profit_margin', 0) or 0) if stock.get('profit_margin') is not None else None,
                    market_cap=_format_market_cap(stock.get('market_cap'), currency),
                    currency=currency
                )
        
        # 2. Add API results (if they aren't already cached)
        tickers_to_query_quotes = []
        for result in api_results:
            ticker = result.get('ticker')
            if ticker:
                if ticker not in combined:
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
        
        # 3. Query quotes in parallel for tickers that are new (only from API and not in DB)
        if tickers_to_query_quotes:
            async def fetch_quote_info(t):
                try:
                    q_data = await stock_service.get_quote(t)
                    return t, q_data
                except Exception as e:
                    print(f"Error fetching quote for {t} during search: {e}")
                    return t, None

            quotes_results = await asyncio.gather(*(fetch_quote_info(t) for t in tickers_to_query_quotes))
            for t, quote in quotes_results:
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
        
        results = list(combined.values())[:10]
        return results
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.post("/screener", response_model=StockScreenerResponse)
async def run_stock_screener(
    request: StockScreenerRequest,
    db: Client = Depends(get_db)
    # TODO: Re-enable authentication: current_user: dict = Depends(get_current_active_user)
):
    """
    Run stock screener with custom filters
    Filter stocks based on financial metrics and fundamentals
    """
    # Get stock screener
    screener = get_stock_screener(db)
    
    try:
        # Convert Pydantic models to dictionaries for the screener
        filters_dict = [
            {
                "field": f.field,
                "operator": f.operator,
                "value": f.value
            }
            for f in request.filters
        ]
        
        # Run screening
        results = screener.screen_stocks(
            filters=filters_dict,
            sort_by=request.sort_by if hasattr(request, 'sort_by') else "market_cap",
            sort_order=request.sort_order if hasattr(request, 'sort_order') else "desc",
            limit=request.limit if hasattr(request, 'limit') else 100
        )
        
        # Convert to response format
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Screening failed: {str(e)}"
        )


@router.get("/details/{ticker}")
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
    ticker = ticker.upper()
    
    # Try to get from database first
    try:
        result = db.table('stocks')\
            .select('*')\
            .eq('ticker', ticker)\
            .eq('is_active', True)\
            .single()\
            .execute()
        
        if result.data:
            stock = result.data
            
            # Check if data is stale (older than 1 hour)
            from datetime import datetime, timedelta
            last_updated = datetime.fromisoformat(stock['last_updated'].replace('Z', '+00:00'))
            if datetime.now(last_updated.tzinfo) - last_updated > timedelta(hours=1):
                # Refresh in background
                background_tasks.add_task(refresh_stock_data, ticker, db)
            
            return stock
    except:
        pass
    
    # Fetch from API
    stock_service = get_stock_data_service()
    
    try:
        # Get comprehensive data
        overview = await stock_service.get_company_overview(ticker)
        
        if not overview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock {ticker} not found"
            )
        
        # Save to database
        db.table('stocks').upsert(overview).execute()
        
        return overview
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock details: {str(e)}"
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
    name: str,
    description: str,
    filters: List[dict],
    is_public: bool = False,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Save a custom screening configuration
    """
    try:
        screen_data = {
            "user_id": current_user['id'],
            "name": name,
            "description": description,
            "filters": filters,
            "is_public": is_public
        }
        
        result = db.table('saved_screens').insert(screen_data).execute()
        
        return {
            "success": True,
            "screen_id": result.data[0]['id'] if result.data else None,
            "message": "Screen saved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save screen: {str(e)}"
        )


@router.get("/screener/saved")
async def get_saved_screens(
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get user's saved custom screens
    """
    try:
        result = db.table('saved_screens')\
            .select('*')\
            .eq('user_id', current_user['id'])\
            .order('created_at', desc=True)\
            .execute()
        
        return {"saved_screens": result.data or []}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch saved screens: {str(e)}"
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
    try:
        watchlist_id = _get_or_create_default_watchlist(db, current_user['id'])
        watchlist_data = {
            "watchlist_id": watchlist_id,
            "ticker": ticker.upper(),
            "notes": notes,
            "target_price": target_price
        }
        
        db.table('watchlist_items').upsert(
            watchlist_data,
            on_conflict='watchlist_id,ticker'
        ).execute()
        
        return {
            "success": True,
            "message": f"{ticker} added to watchlist"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add to watchlist: {str(e)}"
        )


@router.get("/watchlist")
async def get_watchlist(
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get user's watchlist with current prices
    """
    try:
        watchlist_id = _get_or_create_default_watchlist(db, current_user['id'])
        result = db.table('watchlist_items')\
            .select('*')\
            .eq('watchlist_id', watchlist_id)\
            .order('added_at', desc=True)\
            .execute()
        
        return {"watchlist": result.data or []}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch watchlist: {str(e)}"
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
    try:
        watchlist_id = _get_or_create_default_watchlist(db, current_user['id'])
        db.table('watchlist_items')\
            .delete()\
            .eq('watchlist_id', watchlist_id)\
            .eq('ticker', ticker.upper())\
            .execute()
        
        return {
            "success": True,
            "message": f"{ticker} removed from watchlist"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove from watchlist: {str(e)}"
        )


# Helper functions
async def refresh_stock_data(ticker: str, db: Client):
    """Background task to refresh stock data"""
    stock_service = get_stock_data_service()
    try:
        overview = await stock_service.get_company_overview(ticker)
        if overview:
            db.table('stocks').upsert(overview).execute()
    except Exception as e:
        print(f"Error refreshing {ticker}: {e}")


def _format_market_cap(market_cap, currency: str = "USD") -> str:
    """Format market cap to human-readable string"""
    if not market_cap:
        return "N/A"
    
    symbol = "₹" if currency == "INR" else "$"
    
    try:
        mc = float(market_cap)
        if mc >= 1_000_000_000_000:
            return f"{symbol}{mc/1_000_000_000_000:.1f}T"
        elif mc >= 1_000_000_000:
            return f"{symbol}{mc/1_000_000_000:.1f}B"
        elif mc >= 1_000_000:
            return f"{symbol}{mc/1_000_000:.1f}M"
        else:
            return f"{symbol}{mc:,.0f}"
    except:
        return f"{symbol}{market_cap}" if not str(market_cap).startswith(("$", "₹")) else str(market_cap)


def _get_or_create_default_watchlist(db: Client, user_id: str) -> str:
    """Return the user's default watchlist id, creating one if needed."""
    result = db.table('watchlists')\
        .select('id')\
        .eq('user_id', user_id)\
        .eq('is_default', True)\
        .limit(1)\
        .execute()

    if result.data:
        return result.data[0]['id']

    created = db.table('watchlists').insert({
        "user_id": user_id,
        "name": "My Watchlist",
        "description": "Default watchlist for tracking stocks",
        "is_default": True,
        "color": "#3b82f6",
        "sort_order": 0,
    }).execute()

    if not created.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create default watchlist"
        )

    return created.data[0]['id']
