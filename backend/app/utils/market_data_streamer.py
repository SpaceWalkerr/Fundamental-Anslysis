"""
Real-Time Market Data Service
Streams live stock prices and manages price updates
"""
from typing import Dict, List, Optional, Set
import asyncio
from datetime import datetime, timedelta
import json
from collections import defaultdict

from app.utils.stock_data_service import get_stock_data_service
from supabase import Client


class MarketDataStreamer:
    """
    Real-time market data streaming service
    Manages WebSocket connections and price updates
    """
    
    def __init__(self):
        """Initialize market data streamer"""
        self.active_connections: Dict[str, Set] = defaultdict(set)  # ticker -> set of websockets
        self.price_cache: Dict[str, Dict] = {}  # ticker -> latest price data
        self.stock_service = get_stock_data_service()
        self.update_interval = 15  # seconds between price updates
        self.is_running = False
        self._update_task = None
    
    async def start(self):
        """Start the price streaming service"""
        if not self.is_running:
            self.is_running = True
            self._update_task = asyncio.create_task(self._price_update_loop())
    
    async def stop(self):
        """Stop the price streaming service"""
        self.is_running = False
        if self._update_task:
            self._update_task.cancel()
            try:
                await self._update_task
            except asyncio.CancelledError:
                pass
    
    async def subscribe(self, websocket, ticker: str):
        """
        Subscribe a WebSocket connection to a ticker's price updates
        
        Args:
            websocket: WebSocket connection
            ticker: Stock ticker symbol
        """
        ticker = ticker.upper()
        self.active_connections[ticker].add(websocket)
        
        # Send current price immediately if cached
        if ticker in self.price_cache:
            try:
                await websocket.send_json({
                    "type": "price_update",
                    "ticker": ticker,
                    "data": self.price_cache[ticker]
                })
            except:
                pass
    
    async def unsubscribe(self, websocket, ticker: str):
        """
        Unsubscribe a WebSocket connection from a ticker
        
        Args:
            websocket: WebSocket connection
            ticker: Stock ticker symbol
        """
        ticker = ticker.upper()
        if ticker in self.active_connections:
            self.active_connections[ticker].discard(websocket)
            
            # Clean up if no more subscribers
            if not self.active_connections[ticker]:
                del self.active_connections[ticker]
                if ticker in self.price_cache:
                    del self.price_cache[ticker]
    
    async def unsubscribe_all(self, websocket):
        """
        Unsubscribe a WebSocket from all tickers
        
        Args:
            websocket: WebSocket connection
        """
        tickers_to_remove = []
        for ticker, connections in self.active_connections.items():
            connections.discard(websocket)
            if not connections:
                tickers_to_remove.append(ticker)
        
        for ticker in tickers_to_remove:
            del self.active_connections[ticker]
            if ticker in self.price_cache:
                del self.price_cache[ticker]
    
    async def _price_update_loop(self):
        """Background task to fetch and broadcast price updates"""
        while self.is_running:
            try:
                # Get list of subscribed tickers
                tickers = list(self.active_connections.keys())
                
                if tickers:
                    # Fetch prices for all subscribed tickers
                    await self._update_prices(tickers)
                
                # Wait before next update
                await asyncio.sleep(self.update_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in price update loop: {e}")
                await asyncio.sleep(self.update_interval)
    
    async def _update_prices(self, tickers: List[str]):
        """
        Fetch latest prices and broadcast to subscribers
        
        Args:
            tickers: List of ticker symbols to update
        """
        # Batch fetch with rate limiting consideration
        for ticker in tickers:
            try:
                # Fetch quote
                quote = await self.stock_service.get_quote(ticker)
                
                if quote:
                    # Update cache
                    self.price_cache[ticker] = {
                        **quote,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    # Broadcast to all subscribers
                    await self._broadcast_price(ticker, self.price_cache[ticker])
                
                # Small delay to respect rate limits
                await asyncio.sleep(0.5)
                
            except Exception as e:
                print(f"Error updating {ticker}: {e}")
    
    async def _broadcast_price(self, ticker: str, price_data: Dict):
        """
        Broadcast price update to all subscribed connections
        
        Args:
            ticker: Stock ticker
            price_data: Price information to broadcast
        """
        if ticker not in self.active_connections:
            return
        
        message = {
            "type": "price_update",
            "ticker": ticker,
            "data": price_data
        }
        
        # Send to all subscribers, remove dead connections
        dead_connections = set()
        
        for websocket in self.active_connections[ticker]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending to websocket: {e}")
                dead_connections.add(websocket)
        
        # Clean up dead connections
        for websocket in dead_connections:
            await self.unsubscribe(websocket, ticker)
    
    def get_cached_price(self, ticker: str) -> Optional[Dict]:
        """
        Get cached price for a ticker
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Cached price data or None
        """
        return self.price_cache.get(ticker.upper())
    
    def get_subscriber_count(self, ticker: str) -> int:
        """
        Get number of subscribers for a ticker
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Number of active subscribers
        """
        return len(self.active_connections.get(ticker.upper(), set()))
    
    def get_stats(self) -> Dict:
        """Get streaming statistics"""
        return {
            "is_running": self.is_running,
            "active_tickers": len(self.active_connections),
            "total_connections": sum(len(conns) for conns in self.active_connections.values()),
            "cached_prices": len(self.price_cache),
            "update_interval": self.update_interval
        }


class PriceAlertChecker:
    """
    Monitors prices and triggers alerts when conditions are met
    """
    
    def __init__(self, db: Client):
        """Initialize alert checker"""
        self.db = db
        self.check_interval = 60  # Check every minute
        self.is_running = False
        self._check_task = None
    
    async def start(self):
        """Start the alert checking service"""
        if not self.is_running:
            self.is_running = True
            self._check_task = asyncio.create_task(self._alert_check_loop())
    
    async def stop(self):
        """Stop the alert checking service"""
        self.is_running = False
        if self._check_task:
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass
    
    async def _alert_check_loop(self):
        """Background task to check price alerts"""
        while self.is_running:
            try:
                await self._check_alerts()
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in alert check loop: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _check_alerts(self):
        """Check all active price alerts"""
        try:
            # Get all active alerts
            result = self.db.table('price_alerts')\
                .select('*, users!inner(email)')\
                .eq('is_active', True)\
                .execute()
            
            alerts = result.data or []
            
            stock_service = get_stock_data_service()
            
            for alert in alerts:
                try:
                    ticker = alert['ticker']
                    target_price = float(alert['target_price'])
                    condition = alert['condition']  # 'above', 'below'
                    
                    # Fetch current price
                    quote = await stock_service.get_quote(ticker)
                    
                    if not quote or not quote.get('price'):
                        continue
                    
                    current_price = float(quote['price'])
                    triggered = False
                    
                    # Check condition
                    if condition == 'above' and current_price >= target_price:
                        triggered = True
                    elif condition == 'below' and current_price <= target_price:
                        triggered = True
                    
                    if triggered:
                        # Trigger alert
                        await self._trigger_alert(alert, current_price, quote)
                        
                        # Deactivate alert (one-time trigger)
                        self.db.table('price_alerts')\
                            .update({
                                'is_active': False,
                                'triggered_at': datetime.utcnow().isoformat(),
                                'triggered_price': current_price
                            })\
                            .eq('id', alert['id'])\
                            .execute()
                    
                    # Small delay between checks
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    print(f"Error checking alert {alert.get('id')}: {e}")
        
        except Exception as e:
            print(f"Error fetching alerts: {e}")
    
    async def _trigger_alert(self, alert: Dict, current_price: float, quote: Dict):
        """
        Trigger a price alert notification
        
        Args:
            alert: Alert configuration
            current_price: Current stock price
            quote: Full quote data
        """
        try:
            # Create notification record
            notification_data = {
                "user_id": alert['user_id'],
                "type": "price_alert",
                "title": f"{alert['ticker']} Price Alert",
                "message": f"{alert['ticker']} has reached ${current_price:.2f} ({alert['condition']} ${alert['target_price']:.2f})",
                "data": {
                    "ticker": alert['ticker'],
                    "target_price": alert['target_price'],
                    "current_price": current_price,
                    "condition": alert['condition'],
                    "change_percent": quote.get('change_percent', 0)
                },
                "is_read": False
            }
            
            self.db.table('notifications').insert(notification_data).execute()
            
            print(f"✓ Alert triggered: {alert['ticker']} @ ${current_price:.2f}")
            
            # TODO: Send email/push notification if enabled
            # await self._send_email_notification(alert, current_price)
            
        except Exception as e:
            print(f"Error triggering alert: {e}")


# Global instances
_market_streamer = None
_alert_checker = None


def get_market_streamer() -> MarketDataStreamer:
    """Get or create market data streamer instance"""
    global _market_streamer
    if _market_streamer is None:
        _market_streamer = MarketDataStreamer()
    return _market_streamer


def get_alert_checker(db: Client) -> PriceAlertChecker:
    """Get or create price alert checker instance"""
    global _alert_checker
    if _alert_checker is None:
        _alert_checker = PriceAlertChecker(db)
    return _alert_checker
