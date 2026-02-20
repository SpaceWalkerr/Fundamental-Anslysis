# Real-Time Market Data System Documentation

## Overview

The real-time market data system provides live price streaming, price alerts, and historical data for stocks.

## Architecture

### Components

1. **MarketDataStreamer** (`market_data_streamer.py`)
   - Manages WebSocket connections
   - Streams live price updates every 15 seconds
   - Broadcasts to all subscribed clients
   - Auto-starts on app startup

2. **PriceAlertChecker** (`market_data_streamer.py`)
   - Monitors stock prices against user alerts
   - Checks every 60 seconds
   - Triggers notifications when conditions met
   - Auto-deactivates triggered alerts

3. **HistoricalDataService** (`historical_data_service.py`)
   - Fetches daily OHLCV data
   - Manages intraday minute-level prices
   - Caches data in database
   - Supports multiple time periods

4. **WebSocket Endpoint** (`market_ws.py`)
   - Real-time price streaming at `/api/ws/market-data`
   - Subscribe/unsubscribe to tickers
   - Automatic reconnection support

5. **Price Alerts API** (`alerts.py`)
   - Create/manage price alerts
   - Notification center
   - Alert history

6. **Historical Data API** (`history.py`)
   - Daily price charts
   - Intraday charts
   - Price change calculations

## Database Schema

### Tables

#### `price_alerts`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users)
- ticker: TEXT
- condition: TEXT ('above' | 'below')
- target_price: NUMERIC
- is_active: BOOLEAN
- triggered_at: TIMESTAMPTZ
- triggered_price: NUMERIC
- created_at: TIMESTAMPTZ
```

#### `notifications`
```sql
- id: UUID (PK)
- user_id: UUID (FK -> users)
- type: TEXT (price_alert, report_complete, etc.)
- title: TEXT
- message: TEXT
- data: JSONB
- is_read: BOOLEAN
- created_at: TIMESTAMPTZ
```

#### `price_history`
```sql
- id: UUID (PK)
- ticker: TEXT
- date: DATE
- open: NUMERIC
- high: NUMERIC
- low: NUMERIC
- close: NUMERIC
- volume: BIGINT
- adjusted_close: NUMERIC
- created_at: TIMESTAMPTZ
```

#### `intraday_prices`
```sql
- id: UUID (PK)
- ticker: TEXT
- timestamp: TIMESTAMPTZ
- price: NUMERIC
- volume: BIGINT
- created_at: TIMESTAMPTZ
```

## API Endpoints

### WebSocket

#### `WS /api/ws/market-data?token=JWT`

**Client → Server:**
```json
{
  "action": "subscribe",
  "tickers": ["AAPL", "GOOGL"]
}

{
  "action": "unsubscribe",
  "tickers": ["AAPL"]
}

{
  "action": "ping"
}
```

**Server → Client:**
```json
{
  "type": "price_update",
  "ticker": "AAPL",
  "data": {
    "price": 175.25,
    "change": 2.50,
    "change_percent": 1.45,
    "volume": 52340100,
    "timestamp": "2026-02-20T14:35:22Z"
  }
}

{
  "type": "subscribed",
  "tickers": ["AAPL", "GOOGL"]
}

{
  "type": "pong"
}
```

### Price Alerts

#### `POST /api/alerts`
Create a new price alert.

**Request:**
```json
{
  "ticker": "AAPL",
  "condition": "above",
  "target_price": 180.00
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "ticker": "AAPL",
  "condition": "above",
  "target_price": 180.00,
  "is_active": true,
  "created_at": "2026-02-20T10:00:00Z"
}
```

#### `GET /api/alerts?is_active=true`
Get user's price alerts.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "ticker": "AAPL",
    "condition": "above",
    "target_price": 180.00,
    "is_active": true,
    "triggered_at": null,
    "triggered_price": null,
    "created_at": "2026-02-20T10:00:00Z"
  }
]
```

#### `DELETE /api/alerts/{alert_id}`
Delete a price alert.

**Response:** `200 OK`

#### `PATCH /api/alerts/{alert_id}/toggle`
Toggle alert active status.

**Response:** `200 OK`
```json
{
  "is_active": false
}
```

### Notifications

#### `GET /api/alerts/notifications?unread_only=true&limit=50`
Get user notifications.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "type": "price_alert",
    "title": "AAPL Price Alert",
    "message": "AAPL has reached $180.50 (above $180.00)",
    "data": {
      "ticker": "AAPL",
      "target_price": 180.00,
      "current_price": 180.50,
      "condition": "above",
      "change_percent": 1.2
    },
    "is_read": false,
    "created_at": "2026-02-20T14:30:00Z"
  }
]
```

#### `PATCH /api/alerts/notifications/{notification_id}/read`
Mark notification as read.

#### `POST /api/alerts/notifications/read-all`
Mark all notifications as read.

#### `GET /api/alerts/notifications/unread-count`
Get count of unread notifications.

**Response:** `200 OK`
```json
{
  "count": 5
}
```

### Historical Data

#### `GET /api/stocks/{ticker}/history?period=1y`
Get daily historical prices.

**Query Parameters:**
- `period`: `1d` | `5d` | `1mo` | `3mo` | `6mo` | `1y` | `2y` | `5y` | `max`

**Response:** `200 OK`
```json
[
  {
    "date": "2026-02-20",
    "open": 172.50,
    "high": 175.80,
    "low": 171.20,
    "close": 175.25,
    "volume": 52340100,
    "adjusted_close": 175.25
  }
]
```

#### `GET /api/stocks/{ticker}/intraday?interval=5min&period=1d`
Get intraday prices.

**Query Parameters:**
- `interval`: `1min` | `5min` | `15min` | `30min` | `60min`
- `period`: `1d` | `5d`

**Response:** `200 OK`
```json
[
  {
    "timestamp": "2026-02-20T14:30:00Z",
    "price": 175.25,
    "volume": 145200
  }
]
```

#### `GET /api/stocks/{ticker}/price-change?days=1`
Get price change over period.

**Response:** `200 OK`
```json
{
  "ticker": "AAPL",
  "current_price": 175.25,
  "previous_price": 172.75,
  "change": 2.50,
  "change_percent": 1.45
}
```

## Frontend Components

### `useMarketData` Hook

React hook for managing WebSocket connection.

```typescript
import { useMarketData } from '@/hooks/use-market-data';

const { 
  isConnected, 
  prices, 
  subscribe, 
  unsubscribe, 
  getPrice 
} = useMarketData();

// Subscribe to tickers
useEffect(() => {
  subscribe(['AAPL', 'GOOGL']);
  return () => unsubscribe(['AAPL', 'GOOGL']);
}, []);

// Get live price
const applePrice = getPrice('AAPL');
```

### `LivePrice` Component

Display live price for a single ticker.

```tsx
import { LivePrice } from '@/components/LivePrice';

<LivePrice ticker="AAPL" showChange={true} />
```

### `WatchlistLivePrices` Component

Display live prices for multiple tickers.

```tsx
import { WatchlistLivePrices } from '@/components/LivePrice';

<WatchlistLivePrices tickers={['AAPL', 'GOOGL', 'MSFT']} />
```

## Setup Instructions

### 1. Run Database Migration

Execute the migration in Supabase SQL Editor:

```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: migrations/004_add_realtime_features.sql
```

This creates:
- `price_alerts` table
- `notifications` table
- `price_history` table
- `intraday_prices` table
- Indexes for performance
- Helper functions

### 2. Start Backend

The real-time services start automatically with the FastAPI app:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

You should see:
```
🚀 Starting FundaVision API...
✅ Database initialized
📡 Market data streamer started
🔔 Price alert checker started
```

### 3. Test WebSocket Connection

Use a WebSocket client or browser console:

```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws/market-data?token=YOUR_JWT');

ws.onopen = () => {
  // Subscribe to AAPL
  ws.send(JSON.stringify({
    action: 'subscribe',
    tickers: ['AAPL']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};
```

### 4. Create a Price Alert

```bash
curl -X POST http://localhost:8000/api/alerts \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "condition": "above",
    "target_price": 180.00
  }'
```

## Configuration

### Update Intervals

In `market_data_streamer.py`:

```python
# MarketDataStreamer
self.update_interval = 15  # seconds between price updates

# PriceAlertChecker  
self.check_interval = 60  # seconds between alert checks
```

### Data Retention

Intraday data is automatically cleaned after 7 days:

```sql
-- Manual cleanup
SELECT clean_old_intraday_prices();
```

## Performance

### WebSocket

- **Connection overhead**: ~1KB per connection
- **Message size**: ~200 bytes per price update
- **Update frequency**: Every 15 seconds
- **Concurrent connections**: Tested with 1000+ connections

### Database

- **Indexes**: Optimized for ticker, date, and timestamp queries
- **Caching**: Historical data cached after first fetch
- **Retention**: 7 days for intraday, unlimited for daily

### API Rate Limits

- **Alpha Vantage**: 5 calls/min (free tier)
- **FMP**: 250 calls/day (free tier)
- **Internal rate limiting**: 12 sec between API calls

## Troubleshooting

### WebSocket Not Connecting

1. Check backend is running: `http://localhost:8000/health`
2. Verify JWT token is valid
3. Check CORS settings in `config.py`
4. Ensure port 8000 is not blocked

### Price Alerts Not Triggering

1. Verify alert is active: `GET /api/alerts?is_active=true`
2. Check stock exists in database: `GET /api/stocks/search?q=AAPL`
3. Check alert checker is running (see startup logs)
4. Verify API keys are configured

### No Historical Data

1. Ensure migration ran successfully
2. Check API keys in `.env` file
3. Verify stock exists: `GET /api/stocks/details/AAPL`
4. Check API rate limits haven't been exceeded

### High Memory Usage

1. Reduce `update_interval` to decrease frequency
2. Limit number of subscribed tickers
3. Clean old intraday data: `SELECT clean_old_intraday_prices()`

## Future Enhancements

1. **iOS/Android Push Notifications**
   - Firebase Cloud Messaging
   - Native mobile alerts

2. **Email Notifications**
   - SendGrid/AWS SES integration
   - Customizable email templates

3. **Advanced Alerts**
   - Technical indicator triggers (RSI, MACD)
   - Volume spikes
   - News-based alerts

4. **Performance Optimizations**
   - Redis for price caching
   - Batched database writes
   - WebSocket connection pooling

5. **Analytics Dashboard**
   - Price change heatmaps
   - Volume analysis
   - Correlation matrices

## Cost Estimation

### API Costs

| Provider | Tier | Cost | Rate Limit |
|----------|------|------|------------|
| Alpha Vantage | Free | $0 | 5 calls/min, 25/day |
| Alpha Vantage | Premium | $49.99/mo | 120 calls/min |
| FMP | Free | $0 | 250 calls/day |
| FMP | Starter | $14/mo | 1000 calls/day |

### Infrastructure

- **Database**: Included with Supabase free tier (500MB)
- **WebSocket**: No additional cost (FastAPI built-in)
- **Storage**: ~1MB per stock per year (historical data)

## Support

For issues or questions:
- Check logs: `tail -f backend/logs/app.log`
- Review Supabase logs in dashboard
- Test endpoints: `/api/docs` (Swagger UI)
