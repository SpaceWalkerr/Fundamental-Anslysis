# Technical Indicators - Quick Start

## 🚀 What's New

✅ **10+ Technical Indicators** - RSI, MACD, Moving Averages, Bollinger Bands, Stochastic, ATR, OBV  
✅ **Buy/Sell Signals** - Automated signal detection with strength scoring  
✅ **Screening Integration** - Filter stocks by technical indicators  
✅ **Frontend Components** - Ready-to-use React components  

## 📦 Setup (2 steps)

### 1. Run Database Migration

In [Supabase SQL Editor](https://supabase.com/dashboard/project/bwjfrqfqocsugtrypdyu/sql):

```sql
-- Copy and run: backend/migrations/005_add_technical_indicators.sql
```

Creates: `technical_indicators`, `trading_signals`, `signal_alerts` tables

### 2. Install NumPy

```bash
cd backend
source venv/bin/activate
pip install numpy
```

## 💡 Quick Examples

### Get All Indicators + Signals

```bash
curl "http://localhost:8000/api/stocks/AAPL/technicals?period=1y&include_signals=true" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Returns:**
- RSI (14)
- MACD (12, 26, 9)
- Moving Averages (20, 50, 200)
- Bollinger Bands
- Stochastic Oscillator
- **Buy/Sell signal with strength**

### Get Trading Signals Only

```bash
curl "http://localhost:8000/api/stocks/AAPL/signals" \
  -H "Authorization: Bearer YOUR_JWT"
```

**Returns:**
```json
{
  "overall_signal": "BUY",
  "signal_strength": 65.5,
  "buy_signals": [
    "RSI Low (<40)",
    "MACD Bullish Crossover",
    "Golden Cross (MA50 > MA200)"
  ],
  "sell_signals": []
}
```

### Bulk Signals (Scan Watchlist)

```bash
curl -X POST "http://localhost:8000/api/stocks/bulk-signals" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '["AAPL", "GOOGL", "MSFT"]'
```

### Get RSI Chart Data

```bash
curl "http://localhost:8000/api/stocks/AAPL/indicator/rsi?period=1y&indicator_period=14" \
  -H "Authorization: Bearer YOUR_JWT"
```

## 🎨 Frontend Usage

### Technical Analysis Panel

```tsx
import { TechnicalIndicators } from '@/components/TechnicalIndicators';

<TechnicalIndicators ticker="AAPL" />
```

**Shows:**
- Overall signal badge (STRONG BUY, BUY, NEUTRAL, SELL, STRONG SELL)
- Signal strength meter (0-100%)
- List of buy and sell signals
- Key indicator values (RSI, MACD, MAs)
- Color-coded alerts

### Signal Badge Only

```tsx
import { IndicatorBadge } from '@/components/TechnicalIndicators';

<IndicatorBadge ticker="AAPL" />
```

## 📊 Understanding Signals

### Signal Types

| Signal | Meaning | Strength |
|--------|---------|----------|
| **STRONG BUY** | ≥70% bullish indicators | 80-100% |
| **BUY** | 55-69% bullish indicators | 60-79% |
| **NEUTRAL** | 45-54% mixed signals | 45-59% |
| **SELL** | 30-44% bearish indicators | 30-44% |
| **STRONG SELL** | <30% bearish indicators | 10-29% |

### What Triggers Buy Signals?

✅ RSI < 30 (oversold)  
✅ MACD bullish crossover  
✅ Price above MA20 & MA50  
✅ Golden Cross (MA50 > MA200)  
✅ Price at lower Bollinger Band  
✅ Stochastic < 20  

### What Triggers Sell Signals?

❌ RSI > 70 (overbought)  
❌ MACD bearish crossover  
❌ Price below MA20 & MA50  
❌ Death Cross (MA50 < MA200)  
❌ Price at upper Bollinger Band  
❌ Stochastic > 80  

## 🔍 New Screener Presets

Access via `/api/stocks/screener/presets`:

**1. Oversold (RSI)** - RSI < 30, potential bounce candidates  
**2. Golden Cross** - MA50 > MA200, bullish trend  
**3. Strong Buy Signals** - Multiple technical buy signals  

## 📈 Supported Indicators

| Indicator | Default Period | Range | Use Case |
|-----------|---------------|-------|----------|
| **RSI** | 14 | 0-100 | Overbought/oversold |
| **MACD** | 12, 26, 9 | Any | Trend & momentum |
| **SMA** | 20, 50, 200 | Any | Trend direction |
| **EMA** | 12, 26 | Any | Trend (faster response) |
| **Bollinger** | 20, ±2σ | Any | Volatility & reversals |
| **Stochastic** | 14, 3, 3 | 0-100 | Momentum |
| **ATR** | 14 | Any | Volatility measure |
| **OBV** | N/A | Any | Volume momentum |

## 🎯 Common Use Cases

### 1. Find Oversold Stocks

```bash
# Get stocks with RSI < 30
curl -X POST "http://localhost:8000/api/stocks/screener" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": [
      {"field": "rsi", "operator": "lt", "value": 30},
      {"field": "market_cap", "operator": "gt", "value": 1000000000}
    ]
  }'
```

### 2. Check Watchlist Signals

```tsx
const tickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN'];
const response = await api.post('/stocks/bulk-signals', tickers);

// Show stocks with BUY signals
const buyOpportunities = response.data.results.filter(
  s => s.overall_signal === 'BUY' || s.overall_signal === 'STRONG BUY'
);
```

### 3. Get MACD Chart

```bash
curl "http://localhost:8000/api/stocks/AAPL/macd?period=1y" \
  -H "Authorization: Bearer YOUR_JWT"
```

Use returned data with charting library (recharts, chart.js).

### 4. Monitor Bollinger Bands

```bash
curl "http://localhost:8000/api/stocks/AAPL/bollinger-bands?period=6mo" \
  -H "Authorization: Bearer YOUR_JWT"
```

## ⚠️ Important Notes

**Data Requirements:**
- Minimum: 50 days of price history
- Recommended: 200+ days for accurate signals
- Run `populate_stocks.py` if stocks lack data

**Performance:**
- Single stock analysis: ~50-100ms
- Bulk signals (10 stocks): ~1-2 seconds
- Results cached for 30 minutes

**Disclaimer:**
- **Not financial advice**
- Technical indicators can be wrong
- Use with fundamental analysis
- Always DYOR (Do Your Own Research)

## 🐛 Troubleshooting

**"Insufficient price data"**
→ Stock needs 50+ days of history. Run populate_stocks.py

**RSI returns null**
→ Need 15+ days of data (14 periods + 1)

**Signals don't match TradingView**
→ Different data sources, calculation timing, or adjusted prices

**Slow bulk signals**
→ Reduce number of tickers or check API rate limits

## 📚 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /stocks/{ticker}/technicals` | All indicators + signals |
| `GET /stocks/{ticker}/signals` | Buy/sell signals only |
| `POST /stocks/bulk-signals` | Multiple stocks |
| `GET /stocks/{ticker}/indicator/sma` | Specific indicator |
| `GET /stocks/{ticker}/macd` | MACD components |
| `GET /stocks/{ticker}/bollinger-bands` | Bollinger Bands |

## 🚀 Next Steps

1. ✅ Run migration (005_add_technical_indicators.sql)
2. ✅ Install numpy
3. 🎯 Test `/api/stocks/AAPL/technicals`
4. 🔍 Try screener presets with technical filters
5. 📊 Add TechnicalIndicators component to stock pages
6. 🎨 Integrate chart library for visualization

## 📖 Full Documentation

See [TECHNICAL_INDICATORS_DOCS.md](TECHNICAL_INDICATORS_DOCS.md) for:
- Complete API reference with examples
- Technical indicator formulas
- Signal detection logic
- Performance optimization
- Chart integration guide

---

**Tech Stack:** NumPy • FastAPI • React • TypeScript • PostgreSQL
