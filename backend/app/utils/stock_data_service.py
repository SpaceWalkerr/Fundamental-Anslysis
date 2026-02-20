"""
Stock Data Service
Fetches and caches stock market data from external APIs
"""
from typing import Dict, List, Optional
import httpx
import asyncio
from datetime import datetime, timedelta
import os
from app.core.config import settings

class StockDataService:
    """
    Service for fetching stock market data
    Supports Alpha Vantage, Polygon.io, and Financial Modeling Prep
    """
    
    def __init__(self):
        """Initialize stock data service"""
        self.alpha_vantage_key = settings.ALPHA_VANTAGE_API_KEY if hasattr(settings, 'ALPHA_VANTAGE_API_KEY') else os.getenv('ALPHA_VANTAGE_API_KEY')
        self.fmp_key = settings.FMP_API_KEY if hasattr(settings, 'FMP_API_KEY') else os.getenv('FMP_API_KEY')
        
        # API base URLs
        self.alpha_vantage_base = "https://www.alphavantage.co/query"
        self.fmp_base = "https://financialmodelingprep.com/api/v3"
        
        # Rate limiting
        self.last_api_call = None
        self.min_call_interval = 12  # Alpha Vantage free tier: 5 calls/min
    
    async def _rate_limit(self):
        """Enforce rate limiting between API calls"""
        if self.last_api_call:
            elapsed = (datetime.now() - self.last_api_call).total_seconds()
            if elapsed < self.min_call_interval:
                await asyncio.sleep(self.min_call_interval - elapsed)
        self.last_api_call = datetime.now()
    
    async def get_company_overview(self, ticker: str) -> Optional[Dict]:
        """
        Get comprehensive company fundamentals
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Dict with company data or None if failed
        """
        if self.fmp_key:
            return await self._get_overview_fmp(ticker)
        elif self.alpha_vantage_key:
            return await self._get_overview_alpha_vantage(ticker)
        else:
            return None
    
    async def _get_overview_alpha_vantage(self, ticker: str) -> Optional[Dict]:
        """Fetch company overview from Alpha Vantage"""
        await self._rate_limit()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": "OVERVIEW",
                        "symbol": ticker,
                        "apikey": self.alpha_vantage_key
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if data is valid
                    if not data or "Symbol" not in data:
                        return None
                    
                    # Parse and normalize data
                    return {
                        "ticker": data.get("Symbol"),
                        "name": data.get("Name"),
                        "description": data.get("Description"),
                        "sector": data.get("Sector"),
                        "industry": data.get("Industry"),
                        "exchange": data.get("Exchange"),
                        "currency": data.get("Currency"),
                        "country": data.get("Country"),
                        "market_cap": self._parse_number(data.get("MarketCapitalization")),
                        "pe_ratio": self._parse_number(data.get("PERatio")),
                        "peg_ratio": self._parse_number(data.get("PEGRatio")),
                        "book_value": self._parse_number(data.get("BookValue")),
                        "dividend_yield": self._parse_number(data.get("DividendYield"), multiply=100),
                        "eps": self._parse_number(data.get("EPS")),
                        "revenue_per_share": self._parse_number(data.get("RevenuePerShareTTM")),
                        "profit_margin": self._parse_number(data.get("ProfitMargin"), multiply=100),
                        "operating_margin": self._parse_number(data.get("OperatingMarginTTM"), multiply=100),
                        "roe": self._parse_number(data.get("ReturnOnEquityTTM"), multiply=100),
                        "roa": self._parse_number(data.get("ReturnOnAssetsTTM"), multiply=100),
                        "revenue_growth": self._parse_number(data.get("QuarterlyRevenueGrowthYOY"), multiply=100),
                        "earnings_growth": self._parse_number(data.get("QuarterlyEarningsGrowthYOY"), multiply=100),
                        "current_ratio": self._parse_number(data.get("CurrentRatio")),
                        "debt_to_equity": self._parse_number(data.get("DebtToEquity")),
                        "beta": self._parse_number(data.get("Beta")),
                        "week_52_high": self._parse_number(data.get("52WeekHigh")),
                        "week_52_low": self._parse_number(data.get("52WeekLow")),
                        "avg_volume": self._parse_number(data.get("50DayMovingAverage")),
                        "shares_outstanding": self._parse_number(data.get("SharesOutstanding")),
                        "last_updated": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            print(f"Error fetching overview for {ticker}: {e}")
            return None
    
    async def _get_overview_fmp(self, ticker: str) -> Optional[Dict]:
        """Fetch company overview from Financial Modeling Prep"""
        try:
            async with httpx.AsyncClient() as client:
                # Get company profile
                profile_response = await client.get(
                    f"{self.fmp_base}/profile/{ticker}",
                    params={"apikey": self.fmp_key},
                    timeout=10.0
                )
                
                # Get key metrics
                metrics_response = await client.get(
                    f"{self.fmp_base}/key-metrics-ttm/{ticker}",
                    params={"apikey": self.fmp_key},
                    timeout=10.0
                )
                
                if profile_response.status_code == 200 and metrics_response.status_code == 200:
                    profile = profile_response.json()[0] if profile_response.json() else {}
                    metrics = metrics_response.json()[0] if metrics_response.json() else {}
                    
                    return {
                        "ticker": profile.get("symbol"),
                        "name": profile.get("companyName"),
                        "description": profile.get("description"),
                        "sector": profile.get("sector"),
                        "industry": profile.get("industry"),
                        "exchange": profile.get("exchangeShortName"),
                        "currency": profile.get("currency"),
                        "country": profile.get("country"),
                        "market_cap": profile.get("mktCap"),
                        "pe_ratio": metrics.get("peRatioTTM"),
                        "price": profile.get("price"),
                        "beta": profile.get("beta"),
                        "week_52_high": profile.get("year52High"),
                        "week_52_low": profile.get("year52Low"),
                        "dividend_yield": metrics.get("dividendYieldTTM"),
                        "roe": metrics.get("roeTTM"),
                        "roa": metrics.get("roaTTM"),
                        "current_ratio": metrics.get("currentRatioTTM"),
                        "debt_to_equity": metrics.get("debtToEquityTTM"),
                        "revenue_growth": metrics.get("revenuePerShareTTM"),
                        "last_updated": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            print(f"Error fetching FMP data for {ticker}: {e}")
            return None
    
    async def get_quote(self, ticker: str) -> Optional[Dict]:
        """
        Get real-time quote for a stock
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Dict with price data
        """
        if self.fmp_key:
            return await self._get_quote_fmp(ticker)
        elif self.alpha_vantage_key:
            return await self._get_quote_alpha_vantage(ticker)
        else:
            return None
    
    async def _get_quote_alpha_vantage(self, ticker: str) -> Optional[Dict]:
        """Get quote from Alpha Vantage"""
        await self._rate_limit()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": "GLOBAL_QUOTE",
                        "symbol": ticker,
                        "apikey": self.alpha_vantage_key
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json().get("Global Quote", {})
                    
                    if not data:
                        return None
                    
                    return {
                        "ticker": data.get("01. symbol"),
                        "price": self._parse_number(data.get("05. price")),
                        "change": self._parse_number(data.get("09. change")),
                        "change_percent": self._parse_number(data.get("10. change percent", "").replace("%", "")),
                        "volume": self._parse_number(data.get("06. volume")),
                        "latest_trading_day": data.get("07. latest trading day"),
                        "previous_close": self._parse_number(data.get("08. previous close")),
                        "open": self._parse_number(data.get("02. open")),
                        "high": self._parse_number(data.get("03. high")),
                        "low": self._parse_number(data.get("04. low")),
                    }
        except Exception as e:
            print(f"Error fetching quote for {ticker}: {e}")
            return None
    
    async def _get_quote_fmp(self, ticker: str) -> Optional[Dict]:
        """Get quote from Financial Modeling Prep"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.fmp_base}/quote/{ticker}",
                    params={"apikey": self.fmp_key},
                    timeout=10.0
                )
                
                if response.status_code == 200 and response.json():
                    data = response.json()[0]
                    
                    return {
                        "ticker": data.get("symbol"),
                        "price": data.get("price"),
                        "change": data.get("change"),
                        "change_percent": data.get("changesPercentage"),
                        "volume": data.get("volume"),
                        "previous_close": data.get("previousClose"),
                        "open": data.get("open"),
                        "high": data.get("dayHigh"),
                        "low": data.get("dayLow"),
                        "market_cap": data.get("marketCap"),
                        "pe_ratio": data.get("pe"),
                        "eps": data.get("eps"),
                    }
        except Exception as e:
            print(f"Error fetching FMP quote for {ticker}: {e}")
            return None
    
    async def search_companies(self, query: str) -> List[Dict]:
        """
        Search for companies by name or ticker
        
        Args:
            query: Search term
            
        Returns:
            List of matching companies
        """
        if self.fmp_key:
            return await self._search_fmp(query)
        elif self.alpha_vantage_key:
            return await self._search_alpha_vantage(query)
        else:
            return []
    
    async def _search_alpha_vantage(self, query: str) -> List[Dict]:
        """Search using Alpha Vantage"""
        await self._rate_limit()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": "SYMBOL_SEARCH",
                        "keywords": query,
                        "apikey": self.alpha_vantage_key
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    matches = response.json().get("bestMatches", [])
                    
                    return [
                        {
                            "ticker": match.get("1. symbol"),
                            "name": match.get("2. name"),
                            "type": match.get("3. type"),
                            "region": match.get("4. region"),
                            "currency": match.get("8. currency"),
                            "match_score": float(match.get("9. matchScore", 0))
                        }
                        for match in matches[:10]
                    ]
        except Exception as e:
            print(f"Error searching companies: {e}")
            return []
    
    async def _search_fmp(self, query: str) -> List[Dict]:
        """Search using Financial Modeling Prep"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.fmp_base}/search",
                    params={"query": query, "apikey": self.fmp_key, "limit": 10},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    results = response.json()
                    
                    return [
                        {
                            "ticker": result.get("symbol"),
                            "name": result.get("name"),
                            "currency": result.get("currency"),
                            "exchange": result.get("stockExchange"),
                        }
                        for result in results[:10]
                    ]
        except Exception as e:
            print(f"Error searching FMP: {e}")
            return []
    
    async def get_historical_prices(
        self, 
        ticker: str, 
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """
        Get historical daily OHLCV data
        
        Args:
            ticker: Stock ticker symbol
            start_date: Start date
            end_date: End date
            
        Returns:
            List of daily price records
        """
        await self._rate_limit()
        
        if self.fmp_key:
            return await self._get_historical_fmp(ticker, start_date, end_date)
        elif self.alpha_vantage_key:
            return await self._get_historical_alpha_vantage(ticker)
        
        return []
    
    async def _get_historical_fmp(
        self, 
        ticker: str, 
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Fetch historical prices from FMP"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.fmp_base}/historical-price-full/{ticker}",
                    params={
                        "apikey": self.fmp_key,
                        "from": start_date.strftime("%Y-%m-%d"),
                        "to": end_date.strftime("%Y-%m-%d")
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    historical = data.get("historical", [])
                    
                    return [
                        {
                            "date": item["date"],
                            "open": item["open"],
                            "high": item["high"],
                            "low": item["low"],
                            "close": item["close"],
                            "volume": item["volume"],
                            "adjusted_close": item.get("adjClose", item["close"])
                        }
                        for item in historical
                    ]
        except Exception as e:
            print(f"Error fetching historical from FMP: {e}")
        
        return []
    
    async def _get_historical_alpha_vantage(self, ticker: str) -> List[Dict]:
        """Fetch historical prices from Alpha Vantage (last 100 days)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": "TIME_SERIES_DAILY",
                        "symbol": ticker,
                        "apikey": self.alpha_vantage_key,
                        "outputsize": "compact"  # last 100 days
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    time_series = data.get("Time Series (Daily)", {})
                    
                    return [
                        {
                            "date": date,
                            "open": float(values["1. open"]),
                            "high": float(values["2. high"]),
                            "low": float(values["3. low"]),
                            "close": float(values["4. close"]),
                            "volume": int(values["5. volume"]),
                            "adjusted_close": float(values["4. close"])
                        }
                        for date, values in time_series.items()
                    ]
        except Exception as e:
            print(f"Error fetching historical from Alpha Vantage: {e}")
        
        return []
    
    async def get_intraday_prices(
        self, 
        ticker: str, 
        interval: str = "5min"
    ) -> List[Dict]:
        """
        Get intraday price data
        
        Args:
            ticker: Stock ticker symbol
            interval: Time interval (1min, 5min, 15min, 30min, 60min)
            
        Returns:
            List of intraday price records
        """
        await self._rate_limit()
        
        if self.alpha_vantage_key:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        self.alpha_vantage_base,
                        params={
                            "function": "TIME_SERIES_INTRADAY",
                            "symbol": ticker,
                            "interval": interval,
                            "apikey": self.alpha_vantage_key,
                            "outputsize": "compact"
                        },
                        timeout=15.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        time_series_key = f"Time Series ({interval})"
                        time_series = data.get(time_series_key, {})
                        
                        return [
                            {
                                "timestamp": timestamp,
                                "price": float(values["4. close"]),
                                "volume": int(values["5. volume"])
                            }
                            for timestamp, values in time_series.items()
                        ]
            except Exception as e:
                print(f"Error fetching intraday: {e}")
        
        return []
    
    def _parse_number(self, value, multiply: float = 1.0) -> Optional[float]:
        """Parse string number to float"""
        if value is None or value == "None" or value == "":
            return None
        try:
            return float(value) * multiply
        except (ValueError, TypeError):
            return None


# Global instance
_stock_data_service = None

def get_stock_data_service() -> StockDataService:
    """Get or create stock data service instance"""
    global _stock_data_service
    if _stock_data_service is None:
        _stock_data_service = StockDataService()
    return _stock_data_service
