# Portfolio Tracking System - Quick Reference

## Overview

Track your stock holdings, transactions, performance, and portfolio analytics with real-time price updates and comprehensive metrics.

## Features

✅ **Multiple Portfolios** - Create and manage multiple portfolios  
✅ **Transaction Management** - Record buy/sell transactions with automatic holding calculations  
✅ **Real-Time Valuations** - Live price updates for accurate portfolio values  
✅ **Performance Analytics** - Track gains/losses, best/worst performers, sector allocation  
✅ **Diversification Metrics** - Analyze portfolio concentration and risk  
✅ **Cost Basis Tracking** - Automatic average cost basis calculation (FIFO)  
✅ **Realized Gains** - Calculate realized gains/losses from sell transactions  
✅ **Historical Snapshots** - Track portfolio performance over time  

---

## Database Schema

### Tables Created (Migration 007)

**portfolios**
- User can have multiple portfolios (e.g., "Retirement", "Growth", "Income")
- One default portfolio per user
- Tracks: name, description, currency, is_default

**portfolio_holdings**
- Current holdings aggregated from transactions
- Tracks: ticker, quantity, avg_cost_basis, total_cost, first_purchase_date
- Automatically updated via database triggers when transactions are added

**portfolio_transactions**
- All buy/sell/dividend/split transactions
- Tracks: ticker, type, quantity, price, fees, transaction_date, notes
- Triggers automatic holding updates (FIFO cost basis)

**portfolio_snapshots**
- Historical portfolio values for performance tracking
- Daily snapshots of total value, cost, gain/loss
- Used for time-based performance calculations

**portfolio_performance**
- Pre-calculated performance metrics by period (1w, 1m, 3m, 1y, all_time)
- Tracks: total_return, annualized_return, best/worst performers

### Automatic Features

✅ **FIFO Cost Basis** - Automatically calculated when buying/selling  
✅ **One Default Portfolio** - Database enforces single default per user  
✅ **Cascading Deletes** - Deleting portfolio removes all holdings/transactions  
✅ **Row Level Security** - Users can only access their own portfolios  

---

## API Endpoints

### Portfolio CRUD

```http
POST   /api/portfolios/portfolios              # Create portfolio
GET    /api/portfolios/portfolios              # Get all portfolios
GET    /api/portfolios/portfolios/{id}         # Get portfolio
PATCH  /api/portfolios/portfolios/{id}         # Update portfolio
DELETE /api/portfolios/portfolios/{id}         # Delete portfolio
```

### Transactions

```http
POST   /api/portfolios/portfolios/{id}/transactions    # Add transaction
GET    /api/portfolios/portfolios/{id}/transactions    # Get transactions (with filters)
DELETE /api/portfolios/portfolios/{id}/transactions/{txn_id}  # Delete transaction
```

**Add Transaction:**
```json
{
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "transaction_type": "BUY",
  "quantity": 10,
  "price_per_share": 150.00,
  "fees": 1.99,
  "transaction_date": "2026-02-20T10:00:00Z",
  "notes": "Initial purchase"
}
```

### Holdings

```http
GET    /api/portfolios/portfolios/{id}/holdings          # Get all holdings with prices
GET    /api/portfolios/portfolios/{id}/holdings/{ticker} # Get specific holding
PATCH  /api/portfolios/portfolios/{id}/holdings/{ticker} # Update holding notes
```

**Holdings Response:**
```json
{
  "id": "uuid",
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "quantity": 10,
  "avg_cost_basis": 150.00,
  "total_cost": 1500.00,
  "current_price": 175.50,
  "current_value": 1755.00,
  "gain_loss": 255.00,
  "gain_loss_pct": 17.00
}
```

### Analytics

```http
GET /api/portfolios/portfolios/{id}/summary            # Portfolio summary
GET /api/portfolios/portfolios/{id}/analytics          # Detailed analytics
GET /api/portfolios/portfolios/{id}/performance?period=1y  # Performance metrics
GET /api/portfolios/portfolios/{id}/realized-gains     # Realized gains/losses
```

**Summary Response:**
```json
{
  "portfolio_id": "uuid",
  "total_value": 15500.00,
  "total_cost": 12000.00,
  "total_gain_loss": 3500.00,
  "gain_loss_pct": 29.17,
  "num_holdings": 5,
  "best_performer": {
    "ticker": "AAPL",
    "gain_loss_pct": 45.00
  },
  "worst_performer": {
    "ticker": "IBM",
    "gain_loss_pct": -5.23
  }
}
```

**Analytics Response:**
```json
{
  "summary": { /* same as summary endpoint */ },
  "sector_allocation": [
    { "sector": "Technology", "value": 8500.00, "percentage": 54.84 },
    { "sector": "Healthcare", "value": 4000.00, "percentage": 25.81 }
  ],
  "position_sizes": [
    { "ticker": "AAPL", "value": 5500.00, "percentage": 35.48 }
  ],
  "diversification": {
    "score": 75,
    "num_holdings": 5,
    "concentration_risk": "Low",
    "largest_position_pct": 35.48
  },
  "best_performer": { /* ticker, gain_loss_pct, value */ },
  "worst_performer": { /* ticker, gain_loss_pct, value */ }
}
```

---

## Frontend Usage

### Import API

```typescript
import { api } from '@/lib/api';
```

### Create Portfolio

```typescript
const portfolio = await api.portfolio.createPortfolio({
  name: "My Growth Portfolio",
  description: "Long-term growth stocks",
  currency: "USD",
  is_default: true
});
```

### Add Transaction

```typescript
await api.portfolio.addTransaction(portfolioId, {
  ticker: "AAPL",
  transaction_type: "BUY",
  quantity: 10,
  price_per_share: 150.00,
  fees: 1.99,
  transaction_date: new Date().toISOString(),
  notes: "Initial position"
});
```

### Get Holdings with Live Prices

```typescript
const holdings = await api.portfolio.getHoldings(portfolioId, true);

holdings.forEach(holding => {
  console.log(`${holding.ticker}: ${holding.gain_loss_pct.toFixed(2)}%`);
});
```

### Get Portfolio Analytics

```typescript
const analytics = await api.portfolio.getAnalytics(portfolioId);

console.log("Sector Allocation:", analytics.sector_allocation);
console.log("Diversification Score:", analytics.diversification.score);
```

### Get Performance

```typescript
const performance = await api.portfolio.getPerformance(portfolioId, '1y');

console.log("Total Return:", performance.total_return_pct);
console.log("Annualized Return:", performance.annualized_return_pct);
```

---

## Portfolio Analytics

### Metrics Calculated

**Summary Metrics:**
- Total Value (current market value)
- Total Cost (cost basis)
- Total Gain/Loss ($ and %)
- Number of Holdings
- Best/Worst Performers

**Sector Allocation:**
- Value per sector
- Percentage allocation
- Sorted by size

**Position Sizes:**
- Value per holding
- Percentage of portfolio
- Identifies concentration

**Diversification Score (0-100):**
- Based on number of holdings
- Penalized for concentration
- Risk level: Low/Medium/High

**Performance Metrics:**
- Total return ($ and %)
- Annualized return
- Time-weighted return
- Best/worst performers by period

**Realized Gains:**
- FIFO cost basis method
- Calculated from sell transactions
- Separate from unrealized gains

### Example Analytics Output

```
Portfolio Value: $15,500.00
Cost Basis: $12,000.00
Total Gain: +$3,500.00 (+29.17%)

Holdings: 5
Diversification Score: 75/100 (Good)
Concentration Risk: Low
Largest Position: 35.48% (AAPL)

Sector Allocation:
  Technology: 54.84% ($8,500)
  Healthcare: 25.81% ($4,000)
  Finance: 19.35% ($3,000)

Best Performer: AAPL +45.00%
Worst Performer: IBM -5.23%

1Y Performance: +29.17%
Annualized Return: +28.45%
```

---

## Frontend Components

### Portfolio Page (`/dashboard/portfolio`)

Features:
- Portfolio selector (multi-portfolio support)
- Summary cards (value, gain/loss, holdings, best performer)
- Holdings table with live prices
- Add transaction dialog
- Real-time price updates

### Summary Cards

1. **Total Value** - Current portfolio value + cost basis
2. **Total Gain/Loss** - $ and % gains with color coding
3. **Holdings Count** - Number of active positions
4. **Best Performer** - Top gaining stock

### Holdings Table

Columns:
- Symbol (ticker + company name)
- Quantity (shares owned)
- Avg Cost (average cost per share)
- Current Price (live price)
- Market Value (quantity × price)
- Gain/Loss ($ and %)

Features:
- Color-coded gains (green) and losses (red)
- Live price updates
- Sorted by performance
- Click for detailed view

### Add Transaction Dialog

Fields:
- Ticker (symbol)
- Type (BUY/SELL dropdown)
- Quantity (decimal support)
- Price Per Share
- Fees (optional)
- Transaction Date (date picker)
- Notes (optional text)

Validation:
- Required fields enforced
- Numeric validation
- Date cannot be future
- Ticker format

---

## Database Triggers

### Auto-Update Holdings

When a transaction is added:
1. **BUY** - Updates or creates holding, recalculates avg cost
2. **SELL** - Reduces quantity, deletes if quantity reaches zero
3. **FIFO** - Uses first-in-first-out for cost basis

Example:
```sql
-- Buy 10 AAPL @ $150
Holding: 10 shares, $150 avg cost

-- Buy 5 more @ $160
Holding: 15 shares, $153.33 avg cost

-- Sell 8 @ $170
Holding: 7 shares, $153.33 avg cost (FIFO)
Realized Gain: (170 - 150) × 8 = +$160
```

### Enforce Single Default

Only one portfolio can be default per user. Trigger automatically unsets other defaults when setting a new one.

### Update Timestamps

`updated_at` automatically updated on any portfolio or holding change.

---

## Navigation

**Sidebar Link:** Portfolio (Briefcase icon)  
**Route:** `/dashboard/portfolio`  
**Premium:** No (available to all users)  

---

## Roadmap

Future enhancements:
- [ ] Portfolio snapshots automation (daily cron job)
- [ ] Performance charts (line charts over time)
- [ ] Dividend tracking and yield calculations
- [ ] Tax lot management (specific vs FIFO)
- [ ] Portfolio comparison (compare multiple portfolios)
- [ ] Export portfolio to CSV/PDF
- [ ] Import transactions from CSV
- [ ] Asset correlation analysis
- [ ] Rebalancing recommendations
- [ ] Portfolio sharing with read-only access

---

## Testing

### Manual Testing

1. Create portfolio: POST to `/api/portfolios/portfolios`
2. Add BUY transaction: POST to `/api/portfolios/portfolios/{id}/transactions`
3. Check holding created: GET `/api/portfolios/portfolios/{id}/holdings`
4. Add SELL transaction: POST to `/api/portfolios/portfolios/{id}/transactions`
5. Verify holding quantity reduced: GET `/api/portfolios/portfolios/{id}/holdings`
6. Check realized gains: GET `/api/portfolios/portfolios/{id}/realized-gains`
7. Get analytics: GET `/api/portfolios/portfolios/{id}/analytics`

### Test Data

```python
# Create test portfolio
portfolio = {
    "name": "Test Portfolio",
    "description": "For testing",
    "is_default": True
}

# Add buy transaction
buy_txn = {
    "ticker": "AAPL",
    "transaction_type": "BUY",
    "quantity": 10,
    "price_per_share": 150.00,
    "fees": 1.99,
    "transaction_date": "2026-01-01T10:00:00Z"
}

# Add sell transaction
sell_txn = {
    "ticker": "AAPL",
    "transaction_type": "SELL",
    "quantity": 5,
    "price_per_share": 170.00,
    "fees": 1.99,
    "transaction_date": "2026-02-01T10:00:00Z"
}
```

---

## Troubleshooting

### "Portfolio not found"
- Check portfolio ID is correct
- Verify user owns the portfolio (RLS policy)

### Holdings not updating
- Check transaction was created successfully
- Verify database trigger is enabled
- Look for errors in transaction type (must be BUY/SELL)

### Incorrect cost basis
- Review all transactions for the ticker
- Ensure transactions are chronologically ordered
- Check FIFO calculation in database function

### Prices not showing
- Market data API may be slow or unavailable
- Check yfinance is installed: `pip install yfinance`
- Verify ticker symbols are valid

---

## Next Steps

1. Run migration: Execute `007_add_portfolio_tracking.sql`
2. Test API: Try creating a portfolio and adding transactions
3. Frontend: Visit `/dashboard/portfolio` page
4. Add holdings: Record some buy transactions
5. View analytics: Check portfolio summary and analytics

Happy tracking! 📊💰
