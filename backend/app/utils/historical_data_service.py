"""
Historical price data service
Fetches and caches OHLCV data for charts
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio

from app.utils.stock_data_service import get_stock_data_service
from supabase import Client


class HistoricalDataService:
    """
    Service for managing historical price data
    Supports daily and intraday price history
    """
    
    def __init__(self, db: Client):
        """Initialize historical data service"""
        self.db = db
        self.stock_service = get_stock_data_service()
    
    async def get_daily_prices(
        self, 
        ticker: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        period: str = "1y"
    ) -> List[Dict]:
        """
        Get daily historical prices (OHLCV)
        
        Args:
            ticker: Stock ticker symbol
            start_date: Start date (optional)
            end_date: End date (default: today)
            period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max)
            
        Returns:
            List of daily price records
        """
        ticker = ticker.upper()
        
        # Calculate date range from period if not provided
        if not end_date:
            end_date = datetime.now()
        
        if not start_date:
            start_date = self._calculate_start_date(end_date, period)
        
        # Check database cache first
        cached_data = self._get_cached_daily_prices(ticker, start_date, end_date)
        
        # If we have complete data, return it
        if self._is_cache_complete(cached_data, start_date, end_date):
            return cached_data
        
        # Otherwise fetch from API
        try:
            api_data = await self.stock_service.get_historical_prices(ticker, start_date, end_date)
            
            if api_data:
                # Save to database
                self._save_daily_prices(ticker, api_data)
                return api_data
            
            # Fallback to cached data if API fails
            return cached_data
        
        except Exception as e:
            print(f"Error fetching historical prices for {ticker}: {e}")
            return cached_data
    
    async def get_intraday_prices(
        self, 
        ticker: str, 
        interval: str = "5min",
        period: str = "1d"
    ) -> List[Dict]:
        """
        Get intraday price data
        
        Args:
            ticker: Stock ticker symbol
            interval: Time interval (1min, 5min, 15min, 30min, 60min)
            period: Time period (1d, 5d)
            
        Returns:
            List of intraday price records
        """
        ticker = ticker.upper()
        
        # Check cache
        hours = self._period_to_hours(period)
        start_time = datetime.now() - timedelta(hours=hours)
        
        cached_data = self._get_cached_intraday_prices(ticker, start_time)
        
        if cached_data and len(cached_data) > 0:
            return self._aggregate_intraday(cached_data, interval)
        
        # Fetch from API if cache is empty
        try:
            api_data = await self.stock_service.get_intraday_prices(ticker, interval)
            
            if api_data:
                # Save to database
                self._save_intraday_prices(ticker, api_data)
                return api_data
            
            return []
        
        except Exception as e:
            print(f"Error fetching intraday prices for {ticker}: {e}")
            return []
    
    async def record_price_snapshot(self, ticker: str, price: float, volume: int = 0):
        """
        Record a real-time price snapshot to intraday history
        
        Args:
            ticker: Stock ticker
            price: Current price
            volume: Current volume
        """
        try:
            self.db.table('intraday_prices').insert({
                'ticker': ticker.upper(),
                'timestamp': datetime.utcnow().isoformat(),
                'price': price,
                'volume': volume
            }).execute()
        except Exception as e:
            print(f"Error recording price snapshot: {e}")
    
    def _get_cached_daily_prices(self, ticker: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Fetch cached daily prices from database"""
        try:
            result = self.db.table('price_history')\
                .select('*')\
                .eq('ticker', ticker)\
                .gte('date', start_date.date().isoformat())\
                .lte('date', end_date.date().isoformat())\
                .order('date', desc=False)\
                .execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error fetching cached prices: {e}")
            return []
    
    def _get_cached_intraday_prices(self, ticker: str, start_time: datetime) -> List[Dict]:
        """Fetch cached intraday prices from database"""
        try:
            result = self.db.table('intraday_prices')\
                .select('*')\
                .eq('ticker', ticker)\
                .gte('timestamp', start_time.isoformat())\
                .order('timestamp', desc=False)\
                .execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error fetching cached intraday: {e}")
            return []
    
    def _save_daily_prices(self, ticker: str, prices: List[Dict]):
        """Save daily prices to database"""
        try:
            records = []
            for price in prices:
                records.append({
                    'ticker': ticker,
                    'date': price.get('date'),
                    'open': price.get('open'),
                    'high': price.get('high'),
                    'low': price.get('low'),
                    'close': price.get('close'),
                    'volume': price.get('volume'),
                    'adjusted_close': price.get('adjusted_close', price.get('close'))
                })
            
            if records:
                # Upsert (insert or update on conflict)
                self.db.table('price_history').upsert(records).execute()
        except Exception as e:
            print(f"Error saving daily prices: {e}")
    
    def _save_intraday_prices(self, ticker: str, prices: List[Dict]):
        """Save intraday prices to database"""
        try:
            records = []
            for price in prices:
                records.append({
                    'ticker': ticker,
                    'timestamp': price.get('timestamp'),
                    'price': price.get('price'),
                    'volume': price.get('volume', 0)
                })
            
            if records:
                self.db.table('intraday_prices').insert(records).execute()
        except Exception as e:
            print(f"Error saving intraday prices: {e}")
    
    def _is_cache_complete(self, cached_data: List[Dict], start_date: datetime, end_date: datetime) -> bool:
        """Check if cached data covers the entire requested range"""
        if not cached_data:
            return False
        
        # Simple check: do we have at least 90% of expected trading days?
        expected_days = (end_date - start_date).days
        trading_days = expected_days * 0.7  # ~70% of days are trading days
        
        return len(cached_data) >= (trading_days * 0.9)
    
    def _calculate_start_date(self, end_date: datetime, period: str) -> datetime:
        """Calculate start date from period string"""
        periods = {
            '1d': timedelta(days=1),
            '5d': timedelta(days=5),
            '1mo': timedelta(days=30),
            '3mo': timedelta(days=90),
            '6mo': timedelta(days=180),
            '1y': timedelta(days=365),
            '2y': timedelta(days=730),
            '5y': timedelta(days=1825),
            'max': timedelta(days=7300)  # ~20 years
        }
        
        delta = periods.get(period, timedelta(days=365))
        return end_date - delta
    
    def _period_to_hours(self, period: str) -> int:
        """Convert period string to hours"""
        periods = {
            '1d': 24,
            '5d': 120
        }
        return periods.get(period, 24)
    
    def _aggregate_intraday(self, data: List[Dict], interval: str) -> List[Dict]:
        """Aggregate intraday data to specified interval"""
        # For now, return as-is
        # TODO: Implement aggregation logic if needed
        return data


def get_historical_data_service(db: Client) -> HistoricalDataService:
    """Get historical data service instance"""
    return HistoricalDataService(db)
