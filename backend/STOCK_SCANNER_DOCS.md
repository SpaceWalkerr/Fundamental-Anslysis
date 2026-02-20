# Stock Scanner Feature Documentation

## Overview

The Stock Scanner allows users to discover investment opportunities by filtering stocks based on financial metrics and fundamentals. This is a **Premium feature** with full backend integration for real stock data.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                Stock Scanner Flow                           │
└────────────────────────────────────────────────────────────┘

User Input (Filters)
      ↓
Stock Screening Engine
      ↓
Database Query + Filtering
      ↓
Match Score Calculation
      ↓
Ranked Results
      ↓
Frontend Display


┌────────────────────────────────────────────────────────────┐
│                Data Pipeline                                │
└────────────────────────────────────────────────────────────┘

External API →  Stock Data Service  →  Database Cache
   (Alpha         (Rate limiting,        (Stocks table
   Vantage/        parsing, error         with full
   FMP)            handling)              fundamentals)

```

## Components

### 1. Stock Data Service (`app/utils/stock_data_service.py`)

**Purpose**: Fetches real stock data from external APIs

**Supported APIs**:
- **Alpha Vantage** (Free tier: 5 calls/min)
- **Financial Modeling Prep** (Free tier: 250 calls/day)
- **Polygon.io** (Paid, comprehensive)

**Key Methods**:
- `get_company_overview(ticker)` - Comprehensive fundamentals
- `get_quote(ticker)` - Real-time price data
- `search_companies(query)` - Search by name/ticker

**Features**:
- Automatic rate limiting (12 sec between calls)
- API failover (tries FMP if Alpha Vantage fails)
- Data normalization across different APIs
- Error handling with retries

### 2. Stock Screening Engine (`app/utils/stock_screener.py`)

**Purpose**: Filters and ranks stocks based on user criteria

**Key Features**:
- Dynamic filter application
- Match score calculation (0-100)
- Result caching (30 min expire)
- Preset screens (Value, Growth, Dividends, etc.)

**Filter Operators**:
- `eq` - Equal to
- `neq` - Not equal to
- `gt` / `gte` - Greater than / or equal
- `lt` / `lte` - Less than / or equal
- `in` - In list
- `contains` - Text search

**Match Scoring Algorithm**:
```python
# For each filter:
- Exact matches = 100 points
- Range matches = scaled 0-100 based on distance
- Multiple filters averaged

Example:
Filter: P/E < 20
Stock P/E = 15 → Score: 95 (well within range)
Stock P/E = 19 → Score: 100 (just under)
Stock P/E = 25 → Score: 25 (above threshold)
```

### 3. Database Schema

**Tables**:

**`stocks`** - Cached market data
```sql
- ticker (unique)
- name, sector, industry
- price, market_cap, volume
- pe_ratio, dividend_yield, roe, etc.
- last_updated (for cache invalidation)
```

**`saved_screens`** - User custom filters
```sql
- user_id
- name, description
- filters (JSONB array)
- is_public
```

**`watchlists`** - User stock tracking
```sql
- user_id, ticker
- notes, target_price
- alert_enabled
```

**`screening_cache`** - Query results cache
```sql
- filter_hash (MD5 of filters)
- results (JSONB)
- expires_at
```

## API Endpoints

### Company Search
```
GET /api/stocks/search?q=apple
```
Search for companies by name or ticker symbol.

Response:
```json
[
  {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "price": 225.50,
    "change_percent": 2.5,
    "market_cap": "$2.8T"
  }
]
```

### Stock Screener (Premium)
```
POST /api/stocks/screener

{
  "filters": [
    {"field": "sector", "operator": "eq", "value": "Technology"},
    {"field": "pe_ratio", "operator": "lt", "value": 30},
    {"field": "market_cap", "operator": "gt", "value": 1000000000}
  ],
  "sort_by": "match_score",
  "sort_order": "desc",
  "limit": 50
}
```

Response:
```json
{
  "total": 47,
  "results": [
    {
      "ticker": "MSFT",
      "company": "Microsoft Corporation",
      "sector": "Technology",
      "price": 415.25,
      "market_cap": "$3.1T",
      "pe_ratio": 28.5,
      "revenue_growth": 16.2,
      "profit_margin": 35.8,
      "match_score": 95
    }
  ],
  "filters_applied": [...]
}
```

### Stock Details
```
GET /api/stocks/details/AAPL
```
Get comprehensive fundamentals for a stock.

### Screening Presets
```
GET /api/stocks/screener/presets
```
Get predefined screens (Value Stocks, Growth Stocks, etc.)

Response:
```json
{
  "presets": [
    {
      "id": "value_stocks",
      "name": "Value Stocks",
      "description": "Undervalued companies with low P/E and high dividend yield",
      "filters": [
        {"field": "pe_ratio", "operator": "lt", "value": 20},
        {"field": "dividend_yield", "operator": "gt", "value": 2.0}
      ]
    }
  ]
}
```

### Save Custom Screen
```
POST /api/stocks/screener/save

{
  "name": "My Tech Growth Screen",
  "description": "High-growth technology stocks",
  "filters": [...],
  "is_public": false
}
```

### Watchlist Management
```
POST /api/stocks/watchlist/add
GET /api/stocks/watchlist
DELETE /api/stocks/watchlist/AAPL
```

## Setup Instructions

### 1. Get API Keys

Choose one or more stock data APIs:

**Option A: Alpha Vantage (Recommended for Free Tier)**
- Sign up: https://www.alphavantage.co/support/#api-key
- Free tier: 5 calls/minute (25 calls/day)
- Add to `.env`: `ALPHA_VANTAGE_API_KEY=your_key_here`

**Option B: Financial Modeling Prep (Better Free Tier)**
- Sign up: https://site.financialmodelingprep.com/developer/docs
- Free tier: 250 calls/day, faster rate limits
- Add to `.env`: `FMP_API_KEY=your_key_here`

**Option C: Polygon.io (Paid, Production)**
- Most comprehensive, real-time data
- Starts at $25/month
- Add to `.env`: `POLYGON_API_KEY=your_key_here`

### 2. Run Database Migration

Execute in Supabase SQL Editor:
```bash
# Copy content from backend/migrations/003_create_stocks_tables.sql
# Run in: https://supabase.com/dashboard/project/[your-project]/sql
```

Creates tables:
- `stocks` (cached market data)
- `saved_screens` (custom filters)
- `watchlists` (user tracking)
- `screening_cache` (performance)

### 3. Populate Stock Database

Run the population script:
```bash
cd backend
source venv/bin/activate
python populate_stocks.py
```

This will:
- Test API connection
- Fetch 100+ popular stocks
- Save to database
- Takes 20-30 minutes (due to rate limits)

### 4. Test the Scanner

Restart backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

Test endpoints:
```bash
# Search
curl "http://localhost:8000/api/stocks/search?q=apple" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Screen stocks (Premium required)
curl -X POST "http://localhost:8000/api/stocks/screener" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "market_cap", "operator": "gt", "value": 100000000000},
      {"field": "pe_ratio", "operator": "lt", "value": 25}
    ]
  }'
```

## Filtering Options

### Available Fields

**Sector/Industry**:
- `sector` - Technology, Healthcare, Financials, etc.
- `industry` - Software, Pharmaceuticals, etc.
- `exchange` - NASDAQ, NYSE, etc.

**Valuation**:
- `pe_ratio` - Price-to-Earnings
- `peg_ratio` - Price/Earnings to Growth
- `pb_ratio` - Price-to-Book
- `market_cap` - Total market value

**Profitability**:
- `profit_margin` - Net profit margin %
- `operating_margin` - Operating margin %
- `roe` - Return on Equity %
- `roa` - Return on Assets %

**Growth**:
- `revenue_growth` - YoY revenue growth %
- `earnings_growth` - YoY earnings growth %

**Financial Health**:
- `current_ratio` - Current assets / Current liabilities
- `quick_ratio` - Quick assets / Current liabilities  
- `debt_to_equity` - Total debt / Shareholder equity

**Income**:
- `dividend_yield` - Annual dividend / Price
- `eps` - Earnings per share

**Trading**:
- `price` - Current price
- `volume` - Trading volume
- `beta` - Volatility vs market
- `week_52_high/low` - 52-week range

## Preset Screens

### 1. Value Stocks
Low P/E, high dividends, strong fundamentals
```json
{
  "filters": [
    {"field": "pe_ratio", "operator": "lt", "value": 20},
    {"field": "dividend_yield", "operator": "gt", "value": 2.0},
    {"field": "debt_to_equity", "operator": "lt", "value": 1.0}
  ]
}
```

### 2. Growth Stocks
High revenue growth, strong margins
```json
{
  "filters": [
    {"field": "revenue_growth", "operator": "gt", "value": 15},
    {"field": "profit_margin", "operator": "gt", "value": 15},
    {"field": "market_cap", "operator": "gt", "value": 1000000000}
  ]
}
```

### 3. Dividend Aristocrats
Reliable dividend payers
```json
{
  "filters": [
    {"field": "dividend_yield", "operator": "gt", "value": 3.0},
    {"field": "roe", "operator": "gt", "value": 15},
    {"field": "debt_to_equity", "operator": "lt", "value": 0.8}
  ]
}
```

### 4. Quality Stocks
Strong fundamentals across all metrics
```json
{
  "filters": [
    {"field": "roe", "operator": "gt", "value": 15},
    {"field": "profit_margin", "operator": "gt", "value": 15},
    {"field": "current_ratio", "operator": "gt", "value": 1.5},
    {"field": "debt_to_equity", "operator": "lt", "value": 0.5}
  ]
}
```

## Performance Optimization

### Caching Strategy
1. **Stock data cache**: Refreshes hourly
2. **Screening results cache**: 30 minute expiry
3. **Background refresh**: Updates stale data without blocking

### Indexing
```sql
-- Key indexes for fast queries
CREATE INDEX idx_stocks_sector ON stocks(sector);
CREATE INDEX idx_stocks_market_cap ON stocks(market_cap DESC);
CREATE INDEX idx_stocks_pe_ratio ON stocks(pe_ratio);
```

### Rate Limiting
```python
# Built-in rate limiting in stock_data_service
- 12 seconds between API calls (5 calls/min)
- Configurable per API provider
- Automatic backoff on errors
```

## Cost Estimation

### API Costs

**Alpha Vantage Free**:
- 5 calls/minute
- 25 calls/day limit
- **Cost**: FREE
- **Limitation**: Slow for bulk updates

**Financial Modeling Prep Free**:
- 250 calls/day
- Faster rate limits
- **Cost**: FREE
- **Limitation**: Daily cap

**Financial Modeling Prep Paid**:
- 300 calls/minute
- Unlimited daily calls
- **Cost**: $14-49/month
- **Best for**: Production

**Polygon.io**:
- Real-time data
- Unlimited API calls
- **Cost**: $25-250/month
- **Best for**: Professional apps

### Database Storage
- ~2KB per stock record
- 1000 stocks = ~2MB
- 10,000 stocks = ~20MB
- **Cost**: Negligible on Supabase free tier

## Troubleshooting

### "No stock data API key configured"
→ Add `ALPHA_VANTAGE_API_KEY` or `FMP_API_KEY` to `.env`

### "Rate limit exceeded"
→ Alpha Vantage free tier = 5 calls/min. Wait or upgrade.

### "Stock not found"
→ Ticker may be delisted or API doesn't have data. Try different API.

### Stale data
→ Background refresh happens automatically. Force refresh by deleting from `stocks` table.

### Slow screening
→ Ensure database indexes are created (see migration script)
→ Enable result caching (default: on)
→ Reduce filter complexity

## Future Enhancements

Planned features:
- [ ] Technical indicators (RSI, MACD, Moving Averages)
- [ ] Historical backtesting of screens
- [ ] Alert notifications when stocks match criteria
- [ ] Sector/industry comparison charts
- [ ] Export results to CSV/Excel
- [ ] Screen sharing with community
- [ ] Real-time WebSocket price updates
- [ ] AI-powered screen recommendations

## References

- Alpha Vantage Docs: https://www.alphavantage.co/documentation/
- Financial Modeling Prep: https://site.financialmodelingprep.com/developer/docs
- Polygon.io: https://polygon.io/docs/stocks

---

**Ready to scan!** 🔍📊

Once you've added an API key and run the migration, the stock scanner will be fully functional with real market data.
