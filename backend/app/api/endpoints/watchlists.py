"""
Watchlist Manager API Endpoints
Create and manage watchlists, add/remove stocks, set price targets
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.db.database import get_db # get_current_user, get_db
from supabase import Client
from app.utils.watchlist_analytics import WatchlistAnalytics

router = APIRouter()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_default: bool = False

class WatchlistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None

class WatchlistResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    is_default: bool
    color: Optional[str]
    sort_order: int
    item_count: Optional[int] = 0
    created_at: str
    updated_at: str

class WatchlistItemCreate(BaseModel):
    ticker: str = Field(..., max_length=20)
    company_name: Optional[str] = None
    target_price: Optional[float] = Field(None, gt=0)
    target_price_type: Optional[str] = Field(None, pattern="^(BUY|SELL|ALERT)$")
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class WatchlistItemUpdate(BaseModel):
    target_price: Optional[float] = Field(None, gt=0)
    target_price_type: Optional[str] = Field(None, pattern="^(BUY|SELL|ALERT)$")
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class WatchlistItemResponse(BaseModel):
    id: str
    watchlist_id: str
    ticker: str
    company_name: Optional[str]
    added_price: Optional[float]
    target_price: Optional[float]
    target_price_type: Optional[str]
    notes: Optional[str]
    tags: Optional[List[str]]
    added_at: str
    updated_at: str
    # Enriched data (from market API)
    current_price: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    target_distance: Optional[float] = None  # Distance to target price
    target_distance_pct: Optional[float] = None

# ============================================================================
# WATCHLIST CRUD ENDPOINTS
# ============================================================================

@router.post("/watchlists", response_model=WatchlistResponse)
async def create_watchlist(
    watchlist: WatchlistCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Create a new watchlist
    """
    try:
        # Get current max sort_order
        result = supabase.table("watchlists").select("sort_order").eq(
            "user_id", current_user["id"]
        ).order("sort_order", desc=True).limit(1).execute()
        
        max_sort = result.data[0]["sort_order"] if result.data else 0
        
        # Create watchlist
        create_result = supabase.table("watchlists").insert({
            "user_id": current_user["id"],
            "name": watchlist.name,
            "description": watchlist.description,
            "color": watchlist.color or "#3b82f6",
            "is_default": watchlist.is_default,
            "sort_order": max_sort + 1,
        }).execute()
        
        if not create_result.data:
            raise HTTPException(status_code=400, detail="Failed to create watchlist")
        
        return {**create_result.data[0], "item_count": 0}
        
    except Exception as e:
        if "unique_watchlist_name_per_user" in str(e):
            raise HTTPException(status_code=400, detail="Watchlist with this name already exists")
        raise HTTPException(status_code=500, detail=f"Error creating watchlist: {str(e)}")


@router.get("/watchlists", response_model=List[WatchlistResponse])
async def get_watchlists(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get all watchlists for the current user with item counts
    """
    try:
        # Get watchlists with item counts using view
        result = supabase.table("watchlist_summary").select("*").eq(
            "user_id", current_user["id"]
        ).order("sort_order", desc=False).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching watchlists: {str(e)}")


@router.get("/watchlists/{watchlist_id}", response_model=WatchlistResponse)
async def get_watchlist(
    watchlist_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get a specific watchlist by ID with item count
    """
    try:
        result = supabase.table("watchlist_summary").select("*").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching watchlist: {str(e)}")


@router.patch("/watchlists/{watchlist_id}", response_model=WatchlistResponse)
async def update_watchlist(
    watchlist_id: str,
    watchlist: WatchlistUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Update a watchlist
    """
    try:
        # Build update data
        update_data = {}
        if watchlist.name is not None:
            update_data["name"] = watchlist.name
        if watchlist.description is not None:
            update_data["description"] = watchlist.description
        if watchlist.color is not None:
            update_data["color"] = watchlist.color
        if watchlist.is_default is not None:
            update_data["is_default"] = watchlist.is_default
        if watchlist.sort_order is not None:
            update_data["sort_order"] = watchlist.sort_order
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update watchlist
        result = supabase.table("watchlists").update(update_data).eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get item count
        items_result = supabase.table("watchlist_items").select("id", count="exact").eq(
            "watchlist_id", watchlist_id
        ).execute()
        
        return {**result.data[0], "item_count": items_result.count or 0}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating watchlist: {str(e)}")


@router.delete("/watchlists/{watchlist_id}")
async def delete_watchlist(
    watchlist_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Delete a watchlist and all its items
    """
    try:
        # Check if it's the default watchlist
        watchlist_result = supabase.table("watchlists").select("is_default").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist_result.data[0]["is_default"]:
            raise HTTPException(status_code=400, detail="Cannot delete default watchlist")
        
        # Delete watchlist (cascade will handle items)
        result = supabase.table("watchlists").delete().eq("id", watchlist_id).eq(
            "user_id", current_user["id"]
        ).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        return {"success": True, "message": "Watchlist deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting watchlist: {str(e)}")


# ============================================================================
# WATCHLIST ITEMS ENDPOINTS
# ============================================================================

@router.post("/watchlists/{watchlist_id}/items", response_model=WatchlistItemResponse)
async def add_item_to_watchlist(
    watchlist_id: str,
    item: WatchlistItemCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Add a stock to a watchlist
    """
    try:
        # Verify watchlist exists and user owns it
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get current price
        from app.utils.market_data import get_stock_price
        
        added_price = await get_stock_price(item.ticker)
        
        # Create item
        result = supabase.table("watchlist_items").insert({
            "watchlist_id": watchlist_id,
            "ticker": item.ticker.upper(),
            "company_name": item.company_name,
            "added_price": added_price,
            "target_price": item.target_price,
            "target_price_type": item.target_price_type,
            "notes": item.notes,
            "tags": item.tags or [],
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to add item")
        
        # Create price alert if target price is set
        if item.target_price and item.target_price_type:
            await _create_alert_for_target(
                supabase,
                current_user["id"],
                item.ticker.upper(),
                item.target_price,
                item.target_price_type
            )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        if "unique_item_per_watchlist" in str(e):
            raise HTTPException(status_code=400, detail="Stock already in watchlist")
        raise HTTPException(status_code=500, detail=f"Error adding item: {str(e)}")


@router.get("/watchlists/{watchlist_id}/items", response_model=List[WatchlistItemResponse])
async def get_watchlist_items(
    watchlist_id: str,
    include_prices: bool = Query(True, description="Include current prices"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get all items in a watchlist with optional live prices
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get items
        result = supabase.table("watchlist_items").select("*").eq(
            "watchlist_id", watchlist_id
        ).order("added_at", desc=True).execute()
        
        items = result.data or []
        
        # Fetch current prices if requested
        if include_prices and items:
            from app.utils.market_data import get_market_data
            
            tickers = [item["ticker"] for item in items]
            prices = await get_market_data(tickers)
            
            # Enrich items with current prices and calculations
            for item in items:
                ticker = item["ticker"]
                if ticker in prices:
                    price_data = prices[ticker]
                    current_price = price_data.get("price", 0)
                    item["current_price"] = current_price
                    item["change"] = price_data.get("change", 0)
                    item["change_pct"] = price_data.get("change_pct", 0)
                    
                    # Calculate distance to target
                    if item.get("target_price") and current_price > 0:
                        target = float(item["target_price"])
                        item["target_distance"] = target - current_price
                        item["target_distance_pct"] = ((target - current_price) / current_price) * 100
        
        return items
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching items: {str(e)}")


@router.get("/watchlists/{watchlist_id}/items/{item_id}", response_model=WatchlistItemResponse)
async def get_watchlist_item(
    watchlist_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get a specific item in a watchlist
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get item
        result = supabase.table("watchlist_items").select("*").eq(
            "id", item_id
        ).eq("watchlist_id", watchlist_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        item = result.data[0]
        
        # Fetch current price
        from app.utils.market_data import get_market_data
        
        prices = await get_market_data([item["ticker"]])
        ticker = item["ticker"]
        
        if ticker in prices:
            price_data = prices[ticker]
            current_price = price_data.get("price", 0)
            item["current_price"] = current_price
            item["change"] = price_data.get("change", 0)
            item["change_pct"] = price_data.get("change_pct", 0)
            
            if item.get("target_price") and current_price > 0:
                target = float(item["target_price"])
                item["target_distance"] = target - current_price
                item["target_distance_pct"] = ((target - current_price) / current_price) * 100
        
        return item
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching item: {str(e)}")


@router.patch("/watchlists/{watchlist_id}/items/{item_id}", response_model=WatchlistItemResponse)
async def update_watchlist_item(
    watchlist_id: str,
    item_id: str,
    item: WatchlistItemUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Update a watchlist item (target price, notes, tags)
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Build update data
        update_data = {}
        if item.target_price is not None:
            update_data["target_price"] = item.target_price
        if item.target_price_type is not None:
            update_data["target_price_type"] = item.target_price_type
        if item.notes is not None:
            update_data["notes"] = item.notes
        if item.tags is not None:
            update_data["tags"] = item.tags
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update item
        result = supabase.table("watchlist_items").update(update_data).eq(
            "id", item_id
        ).eq("watchlist_id", watchlist_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Update/create price alert if target price changed
        if item.target_price is not None and item.target_price_type is not None:
            item_data = result.data[0]
            await _update_alert_for_target(
                supabase,
                current_user["id"],
                item_data["ticker"],
                item.target_price,
                item.target_price_type
            )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating item: {str(e)}")


@router.delete("/watchlists/{watchlist_id}/items/{item_id}")
async def remove_item_from_watchlist(
    watchlist_id: str,
    item_id: str,
    remove_alert: bool = Query(True, description="Also remove associated price alert"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Remove a stock from a watchlist
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get item info before deletion (for alert cleanup)
        item_result = supabase.table("watchlist_items").select("ticker, target_price, target_price_type").eq(
            "id", item_id
        ).eq("watchlist_id", watchlist_id).execute()
        
        if not item_result.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        item_data = item_result.data[0]
        
        # Delete item
        result = supabase.table("watchlist_items").delete().eq(
            "id", item_id
        ).eq("watchlist_id", watchlist_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Optionally remove associated alert
        if remove_alert and item_data.get("target_price"):
            await _remove_alert_for_ticker(
                supabase,
                current_user["id"],
                item_data["ticker"],
                item_data.get("target_price"),
                item_data.get("target_price_type")
            )
        
        return {"success": True, "message": "Item removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing item: {str(e)}")


# ============================================================================
# BULK OPERATIONS
# ============================================================================

@router.post("/watchlists/{watchlist_id}/items/bulk")
async def add_items_bulk(
    watchlist_id: str,
    tickers: List[str] = Query(..., description="List of tickers to add"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Add multiple stocks to a watchlist at once
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get prices for all tickers
        from app.utils.market_data import get_market_data
        
        prices = await get_market_data(tickers)
        
        # Prepare items for bulk insert
        items_to_insert = []
        for ticker in tickers:
            ticker_upper = ticker.upper()
            added_price = prices.get(ticker_upper, {}).get("price", None)
            company_name = prices.get(ticker_upper, {}).get("name", None)
            
            items_to_insert.append({
                "watchlist_id": watchlist_id,
                "ticker": ticker_upper,
                "company_name": company_name,
                "added_price": added_price,
                "tags": [],
            })
        
        # Bulk insert (will skip duplicates)
        if items_to_insert:
            result = supabase.table("watchlist_items").insert(items_to_insert).execute()
            
            return {
                "success": True,
                "added": len(result.data) if result.data else 0,
                "total": len(tickers)
            }
        
        return {"success": True, "added": 0, "total": 0}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding items: {str(e)}")


@router.delete("/watchlists/{watchlist_id}/items")
async def remove_items_bulk(
    watchlist_id: str,
    tickers: List[str] = Query(..., description="List of tickers to remove"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Remove multiple stocks from a watchlist at once
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Delete items
        tickers_upper = [t.upper() for t in tickers]
        result = supabase.table("watchlist_items").delete().eq(
            "watchlist_id", watchlist_id
        ).in_("ticker", tickers_upper).execute()
        
        return {
            "success": True,
            "removed": len(result.data) if result.data else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing items: {str(e)}")


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/watchlists/{watchlist_id}/summary")
async def get_watchlist_summary(
    watchlist_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get comprehensive summary and analytics for a watchlist
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("*").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        watchlist = watchlist_result.data[0]
        
        # Get items
        items_result = supabase.table("watchlist_items").select("*").eq(
            "watchlist_id", watchlist_id
        ).execute()
        
        items = items_result.data or []
        
        if not items:
            return {
                "watchlist": watchlist,
                "summary": {
                    "total_items": 0,
                    "tracked_value": 0.0,
                    "avg_change_pct": 0.0,
                },
                "target_alerts": [],
                "top_movers": {"gainers": [], "losers": []},
            }
        
        # Get current prices
        from app.utils.market_data import get_market_data
        
        tickers = [item["ticker"] for item in items]
        prices = await get_market_data(tickers)
        
        # Calculate analytics
        summary = WatchlistAnalytics.calculate_summary(items, prices)
        target_alerts = WatchlistAnalytics.get_target_alerts(items, prices)
        top_movers = WatchlistAnalytics.get_top_movers(items, prices, limit=5)
        tag_performance = WatchlistAnalytics.get_performance_by_tag(items, prices)
        hypothetical = WatchlistAnalytics.calculate_hypothetical_value(items, prices)
        
        return {
            "watchlist": watchlist,
            "summary": summary,
            "target_alerts": target_alerts,
            "top_movers": top_movers,
            "tag_performance": tag_performance,
            "hypothetical_investment": hypothetical,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching summary: {str(e)}")


@router.post("/watchlists/{watchlist_id}/snapshot")
async def create_watchlist_snapshot(
    watchlist_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Create a snapshot of current watchlist performance
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get items
        items_result = supabase.table("watchlist_items").select("*").eq(
            "watchlist_id", watchlist_id
        ).execute()
        
        items = items_result.data or []
        
        if not items:
            return {"success": False, "message": "No items to snapshot"}
        
        # Get current prices
        from app.utils.market_data import get_market_data
        
        tickers = [item["ticker"] for item in items]
        prices = await get_market_data(tickers)
        
        # Create snapshot
        snapshot = WatchlistAnalytics.create_snapshot(watchlist_id, items, prices)
        
        # Insert snapshot (will replace existing snapshot for today)
        result = supabase.table("watchlist_snapshots").upsert(snapshot).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create snapshot")
        
        return {"success": True, "snapshot": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating snapshot: {str(e)}")


@router.get("/watchlists/{watchlist_id}/snapshots")
async def get_watchlist_snapshots(
    watchlist_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get historical snapshots for a watchlist
    """
    try:
        # Verify watchlist ownership
        watchlist_result = supabase.table("watchlists").select("id").eq(
            "id", watchlist_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not watchlist_result.data:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        # Get snapshots
        cutoff_date = (datetime.now() - timedelta(days=days)).date()
        
        result = supabase.table("watchlist_snapshots").select("*").eq(
            "watchlist_id", watchlist_id
        ).gte("snapshot_date", cutoff_date.isoformat()).order(
            "snapshot_date", desc=True
        ).execute()
        
        return result.data or []
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching snapshots: {str(e)}")


# ============================================================================
# HELPER FUNCTIONS FOR ALERT INTEGRATION
# ============================================================================

async def _create_alert_for_target(
    supabase: Client,
    user_id: str,
    ticker: str,
    target_price: float,
    target_type: str
):
    """
    Create a price alert for a watchlist target price
    
    Args:
        supabase: Supabase client
        user_id: User ID
        ticker: Stock ticker
        target_price: Target price
        target_type: BUY, SELL, or ALERT
    """
    try:
        # Determine alert condition based on target type
        # BUY: alert when price goes BELOW target (buying opportunity)
        # SELL: alert when price goes ABOVE target (selling opportunity)
        # ALERT: alert when price crosses target (either direction)
        
        if target_type == "BUY":
            condition = "below"
        elif target_type == "SELL":
            condition = "above"
        else:  # ALERT - default to below
            condition = "below"
        
        # Check if alert already exists
        existing = supabase.table("price_alerts").select("id").eq(
            "user_id", user_id
        ).eq("ticker", ticker).eq("target_price", target_price).eq(
            "condition", condition
        ).execute()
        
        if not existing.data:
            # Create new alert
            alert_data = {
                "user_id": user_id,
                "ticker": ticker,
                "condition": condition,
                "target_price": target_price,
                "is_active": True,
            }
            
            supabase.table("price_alerts").insert(alert_data).execute()
    
    except Exception as e:
        # Don't fail the main operation if alert creation fails
        print(f"Warning: Failed to create alert for {ticker}: {str(e)}")


async def _update_alert_for_target(
    supabase: Client,
    user_id: str,
    ticker: str,
    target_price: float,
    target_type: str
):
    """
    Update or create a price alert for a watchlist target price
    
    Args:
        supabase: Supabase client
        user_id: User ID
        ticker: Stock ticker
        target_price: New target price
        target_type: BUY, SELL, or ALERT
    """
    try:
        # Determine alert condition
        if target_type == "BUY":
            condition = "below"
        elif target_type == "SELL":
            condition = "above"
        else:
            condition = "below"
        
        # Find existing alerts for this ticker
        existing = supabase.table("price_alerts").select("*").eq(
            "user_id", user_id
        ).eq("ticker", ticker).eq("is_active", True).execute()
        
        if existing.data:
            # Update existing alert
            alert_id = existing.data[0]["id"]
            supabase.table("price_alerts").update({
                "target_price": target_price,
                "condition": condition,
            }).eq("id", alert_id).execute()
        else:
            # Create new alert
            await _create_alert_for_target(supabase, user_id, ticker, target_price, target_type)
    
    except Exception as e:
        # Don't fail the main operation if alert update fails
        print(f"Warning: Failed to update alert for {ticker}: {str(e)}")


async def _remove_alert_for_ticker(
    supabase: Client,
    user_id: str,
    ticker: str,
    target_price: float,
    target_type: str
):
    """
    Remove price alert associated with a watchlist item
    
    Args:
        supabase: Supabase client
        user_id: User ID
        ticker: Stock ticker
        target_price: Target price
        target_type: BUY, SELL, or ALERT
    """
    try:
        # Determine alert condition
        if target_type == "BUY":
            condition = "below"
        elif target_type == "SELL":
            condition = "above"
        else:
            condition = "below"
        
        # Find and delete matching alert
        supabase.table("price_alerts").delete().eq(
            "user_id", user_id
        ).eq("ticker", ticker).eq("target_price", target_price).eq(
            "condition", condition
        ).execute()
    
    except Exception as e:
        # Don't fail the main operation if alert deletion fails
        print(f"Warning: Failed to remove alert for {ticker}: {str(e)}")
