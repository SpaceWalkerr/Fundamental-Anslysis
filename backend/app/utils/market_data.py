"""
Market Data Utilities
Helper functions for fetching real-time market data
"""

from typing import List, Dict
from datetime import datetime
from app.utils.stock_data_service import get_stock_data_service
from app.db.database import get_supabase_admin_client


async def get_market_data(tickers: List[str]) -> Dict:
    """
    Fetch current market data for multiple tickers using the centralized stock data service.
    Falls back to cached database records if live fetching is rate-limited or fails.
    
    Args:
        tickers: List of stock ticker symbols
        
    Returns:
        Dict mapping tickers to their market data
    """
    result = {}
    
    try:
        service = get_stock_data_service()
        db = get_supabase_admin_client()
        
        # Fetch data for all tickers
        for ticker in tickers:
            ticker_upper = ticker.upper()
            try:
                # 1. Try browser-session backed live get_quote
                quote = await service.get_quote(ticker_upper)
                
                if quote and quote.get("price"):
                    result[ticker_upper] = {
                        "ticker": ticker_upper,
                        "price": float(quote.get("price") or 0),
                        "change": float(quote.get("change") or 0),
                        "change_pct": float(quote.get("change_percent") or 0),
                        "volume": int(quote.get("volume") or 0),
                        "market_cap": int(quote.get("market_cap") or 0),
                        "name": quote.get("name") or ticker_upper,
                        "updated_at": datetime.now().isoformat()
                    }
                    # Update database cache with fresh quote
                    try:
                        db.table('stocks').update({
                            "price": result[ticker_upper]["price"],
                            "change": result[ticker_upper]["change"],
                            "change_percent": result[ticker_upper]["change_pct"],
                            "volume": result[ticker_upper]["volume"],
                            "market_cap": result[ticker_upper]["market_cap"],
                            "last_updated": datetime.utcnow().isoformat()
                        }).eq('ticker', ticker_upper).execute()
                    except Exception as db_err:
                        pass
                else:
                    raise ValueError("Live quote unavailable or returned zero price")
                    
            except Exception as live_err:
                # 2. Fall back to cached database stock data if rate-limited or fails
                try:
                    db_res = db.table('stocks').select('*').eq('ticker', ticker_upper).single().execute()
                    if db_res.data:
                        db_stock = db_res.data
                        result[ticker_upper] = {
                            "ticker": ticker_upper,
                            "price": float(db_stock.get("price") or 0),
                            "change": float(db_stock.get("change") or 0),
                            "change_pct": float(db_stock.get("change_percent") or 0),
                            "volume": int(db_stock.get("volume") or 0),
                            "market_cap": int(db_stock.get("market_cap") or 0),
                            "name": db_stock.get("name") or ticker_upper,
                            "updated_at": db_stock.get("last_updated") or datetime.now().isoformat(),
                            "is_cached_fallback": True
                        }
                        continue
                except Exception as db_err:
                    pass
                
                # 3. Last resort fallback with zero values if DB cache is also empty
                result[ticker_upper] = {
                    "ticker": ticker_upper,
                    "price": 0,
                    "change": 0,
                    "change_pct": 0,
                    "volume": 0,
                    "market_cap": 0,
                    "name": ticker_upper,
                    "updated_at": datetime.now().isoformat(),
                    "error": str(live_err)
                }
        
        return result
        
    except Exception as e:
        return {}


async def get_stock_price(ticker: str) -> float:
    """
    Get current price for a single ticker.
    Falls back to cached database records if live fetching is rate-limited or fails.
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        Current stock price
    """
    ticker_upper = ticker.upper()
    try:
        # 1. Try live get_quote
        service = get_stock_data_service()
        quote = await service.get_quote(ticker_upper)
        if quote and quote.get("price"):
            price = float(quote.get("price"))
            try:
                db = get_supabase_admin_client()
                db.table('stocks').update({
                    "price": price,
                    "change": float(quote.get("change") or 0),
                    "change_percent": float(quote.get("change_percent") or 0),
                    "last_updated": datetime.utcnow().isoformat()
                }).eq('ticker', ticker_upper).execute()
            except Exception:
                pass
            return price
            
    except Exception:
        pass
        
    # 2. Fallback to database
    try:
        db = get_supabase_admin_client()
        db_res = db.table('stocks').select('price').eq('ticker', ticker_upper).single().execute()
        if db_res.data and db_res.data.get('price'):
            return float(db_res.data['price'])
    except Exception:
        pass
        
    return 0
