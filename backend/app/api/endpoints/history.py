"""
Historical price data API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_current_user, get_db
from app.utils.historical_data_service import get_historical_data_service
from supabase import Client

router = APIRouter()


class DailyPriceResponse(BaseModel):
    """Daily price data response"""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    adjusted_close: Optional[float] = None


class IntradayPriceResponse(BaseModel):
    """Intraday price data response"""
    timestamp: str
    price: float
    volume: Optional[int] = None


@router.get("/stocks/{ticker}/history", response_model=List[DailyPriceResponse])
async def get_historical_prices(
    ticker: str,
    period: str = Query("1y", description="Time period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get historical daily prices for a stock
    
    Returns OHLCV (Open, High, Low, Close, Volume) data
    """
    try:
        ticker = ticker.upper()
        
        # Get historical data service
        hist_service = get_historical_data_service(db)
        
        # Fetch prices
        prices = await hist_service.get_daily_prices(ticker, period=period)
        
        if not prices:
            # Try to verify stock exists
            result = db.table('stocks').select('ticker').eq('ticker', ticker).execute()
            if not result.data:
                raise HTTPException(
                    status_code=404,
                    detail=f"Stock {ticker} not found. Please search for it first."
                )
            
            # Stock exists but no historical data
            return []
        
        return prices
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/intraday", response_model=List[IntradayPriceResponse])
async def get_intraday_prices(
    ticker: str,
    interval: str = Query("5min", description="Time interval: 1min, 5min, 15min, 30min, 60min"),
    period: str = Query("1d", description="Time period: 1d, 5d"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get intraday price data for a stock
    
    Useful for minute-level price charts
    """
    try:
        ticker = ticker.upper()
        
        # Validate interval
        valid_intervals = ["1min", "5min", "15min", "30min", "60min"]
        if interval not in valid_intervals:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid interval. Must be one of: {', '.join(valid_intervals)}"
            )
        
        # Get historical data service
        hist_service = get_historical_data_service(db)
        
        # Fetch intraday prices
        prices = await hist_service.get_intraday_prices(ticker, interval, period)
        
        return prices
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/price-change")
async def get_price_change(
    ticker: str,
    days: int = Query(1, ge=1, le=365, description="Number of days to compare"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get price change over specified period
    
    Returns current price, previous price, change amount, and change percentage
    """
    try:
        ticker = ticker.upper()
        
        # Call database function
        result = db.rpc('get_price_change', {
            'p_ticker': ticker,
            'p_days': days
        }).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No price data found for {ticker}"
            )
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
