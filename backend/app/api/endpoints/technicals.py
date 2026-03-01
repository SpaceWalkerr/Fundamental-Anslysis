"""
Technical Analysis API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

from app.core.security import get_current_user
from app.db.database import get_db
from app.utils.technical_indicators import TechnicalIndicators, SignalDetector
from app.utils.historical_data_service import get_historical_data_service
from supabase import Client

router = APIRouter()


class TechnicalIndicatorsResponse(BaseModel):
    """Technical indicators response"""
    ticker: str
    timestamp: datetime
    indicators: Dict
    signals: Optional[Dict] = None


class IndicatorChartResponse(BaseModel):
    """Chart data with indicator overlay"""
    dates: List[str]
    prices: List[float]
    indicator_values: List[Optional[float]]
    indicator_name: str


@router.get("/stocks/{ticker}/technicals", response_model=TechnicalIndicatorsResponse)
async def get_technical_indicators(
    ticker: str,
    period: str = Query("1y", description="Time period for calculation"),
    include_signals: bool = Query(True, description="Include buy/sell signals"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get all technical indicators for a stock
    
    Calculates: SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, OBV
    Includes buy/sell signal detection
    """
    try:
        ticker = ticker.upper()
        
        # Get historical data
        hist_service = get_historical_data_service(db)
        price_data = await hist_service.get_daily_prices(ticker, period=period)
        
        if not price_data or len(price_data) < 50:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient price data for {ticker}. Need at least 50 days."
            )
        
        # Calculate indicators
        indicators = TechnicalIndicators.calculate_all(price_data)
        
        # Detect signals
        signals = None
        if include_signals:
            signals = SignalDetector.detect_signals(indicators, price_data)
        
        return TechnicalIndicatorsResponse(
            ticker=ticker,
            timestamp=datetime.utcnow(),
            indicators=indicators,
            signals=signals
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/indicator/{indicator_name}", response_model=IndicatorChartResponse)
async def get_indicator_chart(
    ticker: str,
    indicator_name: str,
    period: str = Query("1y", description="Time period"),
    indicator_period: int = Query(None, description="Indicator period (e.g., 20 for SMA20)"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get specific indicator chart data
    
    Supported indicators:
    - sma (Simple Moving Average)
    - ema (Exponential Moving Average)
    - rsi (Relative Strength Index)
    - macd (MACD line)
    - bb_upper, bb_middle, bb_lower (Bollinger Bands)
    """
    try:
        ticker = ticker.upper()
        
        # Get historical data
        hist_service = get_historical_data_service(db)
        price_data = await hist_service.get_daily_prices(ticker, period=period)
        
        if not price_data or len(price_data) < 20:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient price data for {ticker}"
            )
        
        # Extract price arrays
        dates = [d['date'] for d in price_data]
        closes = [float(d['close']) for d in price_data]
        highs = [float(d['high']) for d in price_data]
        lows = [float(d['low']) for d in price_data]
        
        # Calculate requested indicator
        indicator_values = []
        indicator_display_name = indicator_name.upper()
        
        if indicator_name == 'sma':
            ind_period = indicator_period or 20
            indicator_values = TechnicalIndicators.sma(closes, ind_period)
            indicator_display_name = f"SMA{ind_period}"
        
        elif indicator_name == 'ema':
            ind_period = indicator_period or 20
            indicator_values = TechnicalIndicators.ema(closes, ind_period)
            indicator_display_name = f"EMA{ind_period}"
        
        elif indicator_name == 'rsi':
            ind_period = indicator_period or 14
            indicator_values = TechnicalIndicators.rsi(closes, ind_period)
            indicator_display_name = f"RSI{ind_period}"
        
        elif indicator_name == 'macd':
            macd_line, _, _ = TechnicalIndicators.macd(closes)
            indicator_values = macd_line
            indicator_display_name = "MACD"
        
        elif indicator_name == 'bb_upper':
            ind_period = indicator_period or 20
            upper, _, _ = TechnicalIndicators.bollinger_bands(closes, ind_period)
            indicator_values = upper
            indicator_display_name = f"BB Upper ({ind_period})"
        
        elif indicator_name == 'bb_middle':
            ind_period = indicator_period or 20
            _, middle, _ = TechnicalIndicators.bollinger_bands(closes, ind_period)
            indicator_values = middle
            indicator_display_name = f"BB Middle ({ind_period})"
        
        elif indicator_name == 'bb_lower':
            ind_period = indicator_period or 20
            _, _, lower = TechnicalIndicators.bollinger_bands(closes, ind_period)
            indicator_values = lower
            indicator_display_name = f"BB Lower ({ind_period})"
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported indicator: {indicator_name}"
            )
        
        return IndicatorChartResponse(
            dates=dates,
            prices=closes,
            indicator_values=indicator_values,
            indicator_name=indicator_display_name
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/signals")
async def get_trading_signals(
    ticker: str,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get buy/sell trading signals for a stock
    
    Returns overall signal, strength, and detailed signal list
    """
    try:
        ticker = ticker.upper()
        
        # Get historical data
        hist_service = get_historical_data_service(db)
        price_data = await hist_service.get_daily_prices(ticker, period="1y")
        
        if not price_data or len(price_data) < 50:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient price data for {ticker}"
            )
        
        # Calculate indicators
        indicators = TechnicalIndicators.calculate_all(price_data)
        
        # Detect signals
        signals = SignalDetector.detect_signals(indicators, price_data)
        
        return {
            "ticker": ticker,
            "timestamp": datetime.utcnow().isoformat(),
            **signals
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stocks/bulk-signals")
async def get_bulk_trading_signals(
    tickers: List[str],
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get trading signals for multiple stocks (async processing)
    
    Returns signal summary for each ticker
    """
    try:
        if len(tickers) > 50:
            raise HTTPException(
                status_code=400,
                detail="Maximum 50 tickers per request"
            )
        
        results = []
        hist_service = get_historical_data_service(db)
        
        for ticker in tickers:
            try:
                ticker = ticker.upper()
                
                # Get price data
                price_data = await hist_service.get_daily_prices(ticker, period="6mo")
                
                if price_data and len(price_data) >= 50:
                    # Calculate indicators
                    indicators = TechnicalIndicators.calculate_all(price_data)
                    
                    # Detect signals
                    signals = SignalDetector.detect_signals(indicators, price_data)
                    
                    results.append({
                        "ticker": ticker,
                        "overall_signal": signals["overall_signal"],
                        "signal_strength": signals["signal_strength"],
                        "rsi": indicators.get("rsi"),
                        "current_price": indicators.get("current_price")
                    })
                else:
                    results.append({
                        "ticker": ticker,
                        "overall_signal": "NO DATA",
                        "signal_strength": None,
                        "error": "Insufficient data"
                    })
            
            except Exception as e:
                results.append({
                    "ticker": ticker,
                    "overall_signal": "ERROR",
                    "signal_strength": None,
                    "error": str(e)
                })
        
        return {
            "count": len(results),
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/macd")
async def get_macd_data(
    ticker: str,
    period: str = Query("1y", description="Time period"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get MACD indicator data (line, signal, histogram)
    """
    try:
        ticker = ticker.upper()
        
        # Get historical data
        hist_service = get_historical_data_service(db)
        price_data = await hist_service.get_daily_prices(ticker, period=period)
        
        if not price_data or len(price_data) < 50:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient price data for {ticker}"
            )
        
        closes = [float(d['close']) for d in price_data]
        dates = [d['date'] for d in price_data]
        
        macd_line, signal_line, histogram = TechnicalIndicators.macd(closes)
        
        return {
            "ticker": ticker,
            "dates": dates,
            "prices": closes,
            "macd_line": macd_line,
            "signal_line": signal_line,
            "histogram": histogram
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stocks/{ticker}/bollinger-bands")
async def get_bollinger_bands(
    ticker: str,
    period: str = Query("1y", description="Time period"),
    bb_period: int = Query(20, description="Bollinger Band period"),
    std_dev: float = Query(2.0, description="Standard deviation multiplier"),
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """
    Get Bollinger Bands data
    """
    try:
        ticker = ticker.upper()
        
        # Get historical data
        hist_service = get_historical_data_service(db)
        price_data = await hist_service.get_daily_prices(ticker, period=period)
        
        if not price_data or len(price_data) < bb_period:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient price data for {ticker}"
            )
        
        closes = [float(d['close']) for d in price_data]
        dates = [d['date'] for d in price_data]
        
        upper, middle, lower = TechnicalIndicators.bollinger_bands(closes, bb_period, std_dev)
        
        return {
            "ticker": ticker,
            "dates": dates,
            "prices": closes,
            "upper_band": upper,
            "middle_band": middle,
            "lower_band": lower,
            "period": bb_period,
            "std_dev": std_dev
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
