"""
Market Data Utilities
Helper functions for fetching real-time market data
"""

from typing import List, Dict
import yfinance as yf
from datetime import datetime


async def get_market_data(tickers: List[str]) -> Dict:
    """
    Fetch current market data for multiple tickers
    
    Args:
        tickers: List of stock ticker symbols
        
    Returns:
        Dict mapping tickers to their market data
    """
    result = {}
    
    try:
        # Fetch data for all tickers
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                info = stock.info
                
                result[ticker.upper()] = {
                    "ticker": ticker.upper(),
                    "price": info.get("currentPrice") or info.get("regularMarketPrice", 0),
                    "change": info.get("regularMarketChange", 0),
                    "change_pct": info.get("regularMarketChangePercent", 0),
                    "volume": info.get("volume", 0),
                    "market_cap": info.get("marketCap", 0),
                    "name": info.get("longName") or info.get("shortName", ticker),
                    "updated_at": datetime.now().isoformat()
                }
            except Exception as e:
                # If individual ticker fails, add it with zero price
                result[ticker.upper()] = {
                    "ticker": ticker.upper(),
                    "price": 0,
                    "error": str(e)
                }
        
        return result
        
    except Exception as e:
        # Return empty dict on complete failure
        return {}


async def get_stock_price(ticker: str) -> float:
    """
    Get current price for a single ticker
    
    Args:
        ticker: Stock ticker symbol
        
    Returns:
        Current stock price
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        return info.get("currentPrice") or info.get("regularMarketPrice", 0)
    except:
        return 0
