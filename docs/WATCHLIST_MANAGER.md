# Watchlist Manager Documentation

## Overview

The Watchlist Manager enables users to track stocks of interest, set price targets, and receive alerts when targets are hit. It's a research and planning tool complementary to the Portfolio Tracking feature.

**Key Features:**
- Multiple named watchlists with color coding
- Price target tracking (BUY/SELL/ALERT)
- Automatic alert creation when targets set
- Tag-based organization
- Performance analytics since addition
- Historical snapshots
- Bulk operations

## Database Schema

### Tables

#### 1. `watchlists`
Stores user's watchlists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| name | VARCHAR(200) | Watchlist name (unique per user) |
| description | TEXT | Optional description |
| is_default | BOOLEAN | Whether this is the default watchlist |
| color | VARCHAR(20) | Hex color code for UI display |
| sort_order | INTEGER | Custom ordering |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Constraints:**
- UNIQUE(user_id, name) - No duplicate watchlist names per user
- Single default watchlist enforced by trigger

**Indexes:**
- idx_watchlists_user_id (user_id)
- idx_watchlists_default (user_id, is_default) - partial index
- idx_watchlists_sort (user_id, sort_order)

#### 2. `watchlist_items`
Stocks within watchlists

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| watchlist_id | UUID | Foreign key to watchlists |
| ticker | VARCHAR(20) | Stock ticker symbol |
| company_name | VARCHAR(500) | Company name |
| added_price | DECIMAL(20,4) | Price when added to watchlist |
| target_price | DECIMAL(20,4) | User's target price |
| target_price_type | VARCHAR(20) | BUY, SELL, or ALERT |
| notes | TEXT | User notes |
| tags | VARCHAR(50)[] | Array of tags for categorization |
| added_at | TIMESTAMPTZ | When item was added |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Constraints:**
- UNIQUE(watchlist_id, ticker) - Each stock appears once per watchlist
- CHECK(target_price_type IN ('BUY', 'SELL', 'ALERT'))

**Indexes:**
- idx_watchlist_items_watchlist_id (watchlist_id)
- idx_watchlist_items_ticker (ticker)
- idx_watchlist_items_tags (tags) - GIN index for array queries

#### 3. `watchlist_snapshots`
Historical performance tracking

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| watchlist_id | UUID | Foreign key to watchlists |
| snapshot_date | DATE | Snapshot date |
| total_value | DECIMAL(20,4) | Total tracked value |
| avg_change_pct | DECIMAL(10,4) | Average change percentage |
| num_items | INTEGER | Number of items in watchlist |
| snapshot_data | JSONB | Detailed snapshot data |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints:**
- UNIQUE(watchlist_id, snapshot_date) - One snapshot per day per watchlist

**Indexes:**
- idx_watchlist_snapshots_watchlist_id (watchlist_id)
- idx_watchlist_snapshots_date (snapshot_date DESC)

### Database Triggers

#### 1. Auto-create Default Watchlist
**Trigger:** `create_default_watchlist_on_user_creation`
- Fires after INSERT on `auth.users`
- Creates "My Watchlist" as default for new users
- Color: #3b82f6 (blue)

#### 2. Enforce Single Default
**Trigger:** `enforce_single_default_watchlist`
- Fires before INSERT/UPDATE on `watchlists` when is_default=true
- Unsets is_default on other watchlists for that user

#### 3. Update Timestamps
**Triggers:** `update_watchlists_timestamp`, `update_watchlist_items_timestamp`
- Auto-update updated_at on modifications

#### 4. Update Parent Watchlist
**Trigger:** `update_watchlist_on_item_change`
- Updates watchlist.updated_at when items added/removed/modified

#### 5. Capture Added Price
**Trigger:** `set_added_price_on_insert`
- Captures stock price when item added (integrates with market data)

### Views

#### `watchlist_summary`
Convenient view with item counts
```sql
SELECT 
  w.*,
  COUNT(wi.id) as item_count
FROM watchlists w
LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
GROUP BY w.id
```

## API Endpoints

### Watchlist CRUD

#### Create Watchlist
```http
POST /api/watchlists/watchlists
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Tech Stocks",
  "description": "High-growth technology companies",
  "color": "#10b981",
  "is_default": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Tech Stocks",
  "description": "High-growth technology companies",
  "is_default": false,
  "color": "#10b981",
  "sort_order": 2,
  "item_count": 0,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

#### Get All Watchlists
```http
GET /api/watchlists/watchlists
Authorization: Bearer <token>
```

**Response:** Array of watchlist objects with item_count

#### Get Specific Watchlist
```http
GET /api/watchlists/watchlists/{watchlist_id}
Authorization: Bearer <token>
```

#### Update Watchlist
```http
PATCH /api/watchlists/watchlists/{watchlist_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "color": "#ef4444",
  "is_default": true
}
```

#### Delete Watchlist
```http
DELETE /api/watchlists/watchlists/{watchlist_id}
Authorization: Bearer <token>
```

**Note:** Cannot delete default watchlist. Items are cascade deleted.

### Watchlist Items

#### Add Item to Watchlist
```http
POST /api/watchlists/watchlists/{watchlist_id}/items
Content-Type: application/json
Authorization: Bearer <token>

{
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "target_price": 150.00,
  "target_price_type": "BUY",
  "notes": "Strong fundamentals, waiting for dip",
  "tags": ["tech", "growth", "blue-chip"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "watchlist_id": "uuid",
  "ticker": "AAPL",
  "company_name": "Apple Inc.",
  "added_price": 175.50,
  "target_price": 150.00,
  "target_price_type": "BUY",
  "notes": "Strong fundamentals, waiting for dip",
  "tags": ["tech", "growth", "blue-chip"],
  "added_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Note:** Automatically creates price alert when target_price is set.

#### Get Watchlist Items
```http
GET /api/watchlists/watchlists/{watchlist_id}/items?include_prices=true
Authorization: Bearer <token>
```

**Response:** Array of items with current prices and calculations:
```json
[
  {
    "id": "uuid",
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "added_price": 175.50,
    "current_price": 170.25,
    "change": -5.25,
    "change_pct": -2.99,
    "target_price": 150.00,
    "target_price_type": "BUY",
    "target_distance": -20.25,
    "target_distance_pct": -11.89,
    "notes": "Strong fundamentals, waiting for dip",
    "tags": ["tech", "growth", "blue-chip"],
    "added_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

#### Update Watchlist Item
```http
PATCH /api/watchlists/watchlists/{watchlist_id}/items/{item_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "target_price": 145.00,
  "target_price_type": "BUY",
  "notes": "Updated target after Q4 earnings",
  "tags": ["tech", "growth", "value"]
}
```

**Note:** Updates associated price alert if target_price changed.

#### Remove Item from Watchlist
```http
DELETE /api/watchlists/watchlists/{watchlist_id}/items/{item_id}?remove_alert=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `remove_alert` (boolean, default: true) - Also remove associated price alert

### Bulk Operations

#### Add Multiple Items
```http
POST /api/watchlists/watchlists/{watchlist_id}/items/bulk?tickers=AAPL&tickers=MSFT&tickers=GOOGL
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "added": 3,
  "total": 3
}
```

#### Remove Multiple Items
```http
DELETE /api/watchlists/watchlists/{watchlist_id}/items?tickers=AAPL&tickers=MSFT
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "removed": 2
}
```

### Analytics

#### Get Watchlist Summary
```http
GET /api/watchlists/watchlists/{watchlist_id}/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "watchlist": {
    "id": "uuid",
    "name": "Tech Stocks",
    "description": "High-growth technology companies",
    "color": "#10b981"
  },
  "summary": {
    "total_items": 15,
    "tracked_value": 2543.75,
    "avg_change_pct": 5.23,
    "best_performer": {
      "ticker": "NVDA",
      "change_pct": 23.45
    },
    "worst_performer": {
      "ticker": "INTC",
      "change_pct": -8.12
    },
    "targets_hit": 3,
    "targets_near": 2,
    "avg_target_distance": 8.45
  },
  "target_alerts": [
    {
      "ticker": "AAPL",
      "current_price": 150.25,
      "target_price": 150.00,
      "target_type": "BUY",
      "distance": -0.25,
      "distance_pct": -0.17,
      "status": "hit",
      "notes": "Strong fundamentals"
    }
  ],
  "top_movers": {
    "gainers": [
      {
        "ticker": "NVDA",
        "added_price": 450.00,
        "current_price": 555.50,
        "change": 105.50,
        "change_pct": 23.45
      }
    ],
    "losers": [
      {
        "ticker": "INTC",
        "added_price": 45.00,
        "current_price": 41.35,
        "change": -3.65,
        "change_pct": -8.12
      }
    ]
  },
  "tag_performance": {
    "tech": {
      "count": 10,
      "avg_change_pct": 6.78,
      "best_change_pct": 23.45,
      "worst_change_pct": -8.12
    }
  },
  "hypothetical_investment": {
    "total_invested": 15000.00,
    "current_value": 15784.50,
    "gain_loss": 784.50,
    "gain_loss_pct": 5.23,
    "stocks_analyzed": 15,
    "investment_per_stock": 1000.00
  }
}
```

#### Create Snapshot
```http
POST /api/watchlists/watchlists/{watchlist_id}/snapshot
Authorization: Bearer <token>
```

Creates/updates snapshot for current date.

#### Get Historical Snapshots
```http
GET /api/watchlists/watchlists/{watchlist_id}/snapshots?days=30
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (integer, 1-365, default: 30) - Number of days of history

## Frontend Integration

### API Client Methods

All methods available in `src/lib/api.ts` under `api.watchlists`:

```typescript
// Watchlist CRUD
api.watchlists.getWatchlists()
api.watchlists.getWatchlist(watchlistId)
api.watchlists.createWatchlist({ name, description, color, is_default })
api.watchlists.updateWatchlist(watchlistId, { name, color, ... })
api.watchlists.deleteWatchlist(watchlistId)

// Items
api.watchlists.getWatchlistItems(watchlistId, includePrices)
api.watchlists.getWatchlistItem(watchlistId, itemId)
api.watchlists.addItemToWatchlist(watchlistId, { ticker, target_price, ... })
api.watchlists.updateWatchlistItem(watchlistId, itemId, { target_price, ... })
api.watchlists.removeItemFromWatchlist(watchlistId, itemId)

// Bulk
api.watchlists.addItemsBulk(watchlistId, ['AAPL', 'MSFT', 'GOOGL'])
api.watchlists.removeItemsBulk(watchlistId, ['AAPL', 'MSFT'])

// Analytics
api.watchlists.getWatchlistSummary(watchlistId)
api.watchlists.createSnapshot(watchlistId)
api.watchlists.getSnapshots(watchlistId, 30)
```

### Watchlist Page

**Route:** `/dashboard/watchlist`
**Component:** `src/pages/Watchlist.tsx`

**Features:**
- Tabbed watchlist selector
- Summary cards (total items, avg performance, targets hit, tracked value)
- Items table with live prices and target tracking
- Create watchlist dialog
- Add stock dialog with target price and tags
- Visual indicators for targets hit/near
- Remove items with single click

**UI Elements:**
- Color-coded watchlist tabs
- Target status badges (HIT/NEAR)
- TrendingUp/Down icons for performance
- Tags display with outline badges
- Empty state with call-to-action

## Alert Integration

### Automatic Alert Creation

When a user adds a watchlist item with a target price:
1. System determines alert condition based on target type:
   - **BUY target** → Alert when price goes **BELOW** target (buying opportunity)
   - **SELL target** → Alert when price goes **ABOVE** target (selling opportunity)
   - **ALERT type** → Alert when price crosses target (default: below)

2. Creates entry in `price_alerts` table:
   ```json
   {
     "user_id": "uuid",
     "ticker": "AAPL",
     "condition": "below",
     "target_price": 150.00,
     "is_active": true
   }
   ```

3. Background alert checker monitors prices and triggers notifications

### Alert Update

When target price is updated:
- Finds existing active alert for that ticker
- Updates target_price and condition
- If no alert exists, creates new one

### Alert Removal

When watchlist item is removed:
- Optionally removes associated price alert
- Controlled by `remove_alert` query parameter (default: true)
- User can keep alert active even after removing from watchlist

## Tag System Best Practices

### Suggested Tag Categories

**Sector Tags:**
- `tech`, `finance`, `healthcare`, `energy`, `consumer`, `industrial`

**Strategy Tags:**
- `growth`, `value`, `dividend`, `momentum`, `turnaround`

**Risk Tags:**
- `low-risk`, `medium-risk`, `high-risk`, `speculative`

**Analysis Tags:**
- `undervalued`, `overvalued`, `fair-value`, `strong-buy`, `hold`, `watch`

**Event Tags:**
- `earnings-soon`, `dividend-upcoming`, `merger`, `ipo`

### Tag Usage

- **Multiple tags per stock:** Categorize from different angles
- **Consistent naming:** Use lowercase, hyphenated tags
- **Performance by tag:** Use analytics to track tag-based strategies
- **Filtering:** Filter watchlist by specific tags (UI feature)

## Price Target Strategies

### BUY Targets
**Use Case:** Set target price you'd like to buy at
- Alert triggers when price drops to or below target
- Indicates buying opportunity at desired price
- Example: "AAPL currently $175, want to buy at $150"

### SELL Targets
**Use Case:** Set target price you'd sell at (hypothetically, since stock not owned yet)
- Alert triggers when price rises to or above target
- Could indicate "missed opportunity" or "overvalued"
- Example: "TSLA currently $200, would sell if it hits $250"

### ALERT Targets
**Use Case:** General price notification without buy/sell implication
- Alert triggers when price crosses target
- Useful for monitoring specific price levels
- Example: "Want to know if FB drops below $300"

## Performance Metrics

### Summary Metrics

1. **Total Items:** Count of stocks in watchlist
2. **Tracked Value:** Sum of current prices (hypothetical if bought one share each)
3. **Avg Performance:** Average change % since each stock was added
4. **Best/Worst Performers:** Highest/lowest gainers since addition
5. **Targets Hit:** Number of price targets reached
6. **Targets Near:** Number within 5% of target

### Analytics Calculations

**Change Since Added:**
```
change = current_price - added_price
change_pct = (change / added_price) * 100
```

**Distance to Target:**
```
distance = target_price - current_price
distance_pct = (distance / current_price) * 100
```

**Hypothetical Investment:**
Assumes fixed amount invested per stock at added_price
```
total_invested = investment_per_stock * num_stocks
current_value = sum(shares * current_price for each stock)
gain_loss = current_value - total_invested
```

## Advanced Features

### Snapshots System

**Purpose:** Track watchlist performance over time

**Snapshot Data Structure:**
```json
{
  "watchlist_id": "uuid",
  "snapshot_date": "2024-01-15",
  "total_value": 2543.75,
  "avg_change_pct": 5.23,
  "num_items": 15,
  "snapshot_data": {
    "AAPL": {
      "added_price": 175.50,
      "current_price": 170.25,
      "change": -5.25,
      "change_pct": -2.99,
      "target_price": 150.00,
      "target_type": "BUY"
    },
    "MSFT": { ... }
  }
}
```

**Use Cases:**
- Track if watchlist stocks trending up/down over time
- Compare snapshots to see which stocks most volatile
- Historical analysis of target setting accuracy

### Bulk Operations

**Adding Multiple Stocks:**
```bash
# Add array of tickers at once
POST /api/watchlists/{id}/items/bulk?tickers=AAPL&tickers=MSFT&tickers=GOOGL
```

**Benefits:**
- Faster than individual API calls
- Useful for importing from CSV or external sources
- Transaction-like (all succeed or all fail)

**Use Cases:**
- Import watchlist from another platform
- Add all stocks from a sector/index
- Clone watchlist to new list

## Migration

### Running the Migration

```bash
# Connect to Supabase
psql -h db.xxx.supabase.co -U postgres -d postgres

# Run migration
\i backend/migrations/008_add_watchlist_manager.sql
```

### Verification

```sql
-- Check tables created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'watchlist%';

-- Check triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table IN ('watchlists', 'watchlist_items', 'auth.users');

-- Check view
SELECT * FROM watchlist_summary LIMIT 1;

-- Check default watchlist creation
-- (Register new user and verify "My Watchlist" created)
```

## Testing Checklist

### Backend Tests
- [ ] Create watchlist
- [ ] Get watchlists with item counts
- [ ] Update watchlist (name, color, is_default)
- [ ] Delete non-default watchlist
- [ ] Cannot delete default watchlist
- [ ] Add item to watchlist
- [ ] Get items with current prices
- [ ] Update item target price
- [ ] Remove item from watchlist
- [ ] Bulk add multiple tickers
- [ ] Bulk remove multiple tickers
- [ ] Get watchlist summary with analytics
- [ ] Create snapshot
- [ ] Get historical snapshots
- [ ] Alert created when target set
- [ ] Alert updated when target changed
- [ ] Alert removed when item deleted
- [ ] Single default watchlist enforced
- [ ] New user gets default watchlist

### Frontend Tests
- [ ] Watchlist tabs display correctly
- [ ] Create new watchlist dialog
- [ ] Add stock with target price
- [ ] Item table shows live prices
- [ ] Target badges show correctly (HIT/NEAR)
- [ ] Remove item from watchlist
- [ ] Summary cards update after changes
- [ ] Tags display properly
- [ ] Empty state when no items
- [ ] Navigation to watchlist page

### Integration Tests
- [ ] Add watchlist item → Alert created in price_alerts table
- [ ] Update target → Alert updated
- [ ] Remove item → Alert deleted
- [ ] Stock in multiple watchlists → Independent alerts
- [ ] Alert triggers → User receives notification

## Troubleshooting

### Common Issues

**Issue:** Watchlist item already exists
**Solution:** Each ticker can only appear once per watchlist. Remove first or add to different watchlist.

**Issue:** Cannot delete default watchlist
**Solution:** Set another watchlist as default first, then delete.

**Issue:** Alert not created when target set
**Solution:** Check price_alerts table for errors. Alerts fail gracefully (won't block item creation).

**Issue:** Current prices not loading
**Solution:** Check market data API connection. Verify yfinance working.

**Issue:** Multiple default watchlists
**Solution:** Shouldn't happen (enforced by trigger), but can manually run:
```sql
UPDATE watchlists 
SET is_default = false 
WHERE user_id = 'user_uuid' AND id != 'desired_default_uuid';
```

## Future Enhancements

### Planned Features
1. **Import from CSV** - Upload watchlist from spreadsheet
2. **Public Watchlists** - Share read-only watchlist via URL
3. **Watchlist Templates** - Pre-made lists (e.g., "S&P 500 Tech Stocks")
4. **Clone Watchlist** - Duplicate existing watchlist
5. **Merge Watchlists** - Combine two watchlists into one
6. **Side-by-side Comparison** - Compare performance of multiple watchlists
7. **Performance Charts** - Line chart showing watchlist value over time
8. **Email Digests** - Weekly summary of watchlist performance
9. **Smart Suggestions** - AI recommendations based on watchlist patterns
10. **Advanced Filtering** - Filter by sector, performance, target status
11. **Export to PDF** - Generate PDF report of watchlist (using existing PDF service)
12. **Add to Portfolio** - Quick action to add watchlist stock to portfolio when buying

### Integration Opportunities
- **Stock Scanner** - Add scanner results to watchlist
- **Analysis Reports** - Add analyzed stocks to watchlist
- **Chat** - Ask AI about watchlist stocks
- **Dashboard** - Show watchlist summary widget

## Related Features

### Portfolio Tracking
Watchlist Manager complements Portfolio Tracking:
- **Watchlist** = Stocks you're researching (don't own yet)
- **Portfolio** = Stocks you own

**Workflow:**
1. Research stocks → Add to Watchlist
2. Set price targets → Receive alerts
3. Target hit → Buy stock
4. Record transaction → Stock now in Portfolio
5. Track ownership → Portfolio Tracking

### Price Alerts
Watchlist Manager automatically integrates with Price Alerts:
- Setting target price creates alert
- Alert triggers notification
- View all alerts in Alerts page
- Manage alerts separately from watchlist

### PDF Export
Generate PDF reports of watchlists:
- Summary page with metrics
- Table of all items with targets
- Performance chart
- Tag-based grouping

## API Reference Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/watchlists/watchlists` | POST | Create watchlist |
| `/api/watchlists/watchlists` | GET | Get all watchlists |
| `/api/watchlists/watchlists/{id}` | GET | Get specific watchlist |
| `/api/watchlists/watchlists/{id}` | PATCH | Update watchlist |
| `/api/watchlists/watchlists/{id}` | DELETE | Delete watchlist |
| `/api/watchlists/watchlists/{id}/items` | POST | Add item |
| `/api/watchlists/watchlists/{id}/items` | GET | Get items |
| `/api/watchlists/watchlists/{id}/items/{item_id}` | GET | Get specific item |
| `/api/watchlists/watchlists/{id}/items/{item_id}` | PATCH | Update item |
| `/api/watchlists/watchlists/{id}/items/{item_id}` | DELETE | Remove item |
| `/api/watchlists/watchlists/{id}/items/bulk` | POST | Add multiple items |
| `/api/watchlists/watchlists/{id}/items` | DELETE | Remove multiple items |
| `/api/watchlists/watchlists/{id}/summary` | GET | Get analytics summary |
| `/api/watchlists/watchlists/{id}/snapshot` | POST | Create snapshot |
| `/api/watchlists/watchlists/{id}/snapshots` | GET | Get snapshots |

## Support

For issues or questions:
1. Check this documentation
2. Review database schema and triggers
3. Check backend logs for errors
4. Verify API responses with Postman/Insomnia
5. Test with simple cases (single item, single watchlist)

---

**Last Updated:** January 2024
**Version:** 1.0.0
**Related Docs:** PORTFOLIO_TRACKING.md, SUPABASE_SETUP.md
