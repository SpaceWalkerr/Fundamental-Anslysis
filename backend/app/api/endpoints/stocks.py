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
        
        # Also search local database for cached stocks
        db_results = db.table('stocks')\
            .select('ticker, name, sector, price, change_percent, market_cap')\
            .or_(f"ticker.ilike.%{q}%,name.ilike.%{q}%")\
            .eq('is_active', True)\
            .limit(10)\
            .execute()
        
        # Combine and deduplicate results
        combined = {}
        
        # Add API results
        for result in api_results:
            ticker = result.get('ticker')
            if ticker:
                combined[ticker] = CompanySearch(
                    ticker=ticker,
                    name=result.get('name', ''),
                    sector=result.get('sector', ''),
                    price=0,  # Will be fetched separately if needed
                    change_percent=0,
                    pe_ratio=None,
                    revenue_growth=None,
                    profit_margin=None,
                    market_cap=""
                )
        
        # Add/update from database
        for stock in (db_results.data or []):
            ticker = stock.get('ticker')
            if ticker:
                combined[ticker] = CompanySearch(
                    ticker=ticker,
                    name=stock.get('name', ''),
                    sector=stock.get('sector', ''),
                    price=float(stock.get('price', 0) or 0),
                    change_percent=float(stock.get('change_percent', 0) or 0),
                    pe_ratio=None,
                    revenue_growth=None,
                    profit_margin=None,
                    market_cap=str(stock.get('market_cap', ''))
                )
        
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
    current_user: dict = Depends(require_premium),  # Premium feature
    db: Client = Depends(get_db)
):
    """
    Run stock screener with custom filters (Premium feature)
    Filter stocks based on financial metrics and fundamentals
    """
    # Get stock screener
    screener = get_stock_screener(db)
    
    try:
        # Run screening
        results = screener.screen_stocks(
            filters=request.filters,
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
                market_cap=_format_market_cap(stock.get('market_cap')),
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
        watchlist_data = {
            "user_id": current_user['id'],
            "ticker": ticker.upper(),
            "notes": notes,
            "target_price": target_price
        }
        
        result = db.table('watchlists').upsert(watchlist_data).execute()
        
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
        result = db.table('watchlists')\
            .select('*, stocks!inner(*)')\
            .eq('user_id', current_user['id'])\
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
        db.table('watchlists')\
            .delete()\
            .eq('user_id', current_user['id'])\
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


def _format_market_cap(market_cap) -> str:
    """Format market cap to human-readable string"""
    if not market_cap:
        return "N/A"
    
    try:
        mc = float(market_cap)
        if mc >= 1_000_000_000_000:
            return f"${mc/1_000_000_000_000:.1f}T"
        elif mc >= 1_000_000_000:
            return f"${mc/1_000_000_000:.1f}B"
        elif mc >= 1_000_000:
            return f"${mc/1_000_000:.1f}M"
        else:
            return f"${mc:,.0f}"
    except:
        return str(market_cap)
