"""
Portfolio Tracking API Endpoints
Manage portfolios, holdings, transactions, and performance
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field
from decimal import Decimal

from app.core.security import get_current_user
from app.db.database import get_db # get_current_user, get_db
from supabase import Client

router = APIRouter()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    currency: str = Field(default="USD", max_length=3)
    is_default: bool = False

class PortfolioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_default: Optional[bool] = None

class PortfolioResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    currency: str
    is_default: bool
    created_at: str
    updated_at: str

class TransactionCreate(BaseModel):
    ticker: str = Field(..., max_length=20)
    company_name: Optional[str] = None
    transaction_type: str = Field(..., pattern="^(BUY|SELL|DIVIDEND|SPLIT)$")
    quantity: float = Field(..., gt=0)
    price_per_share: float = Field(..., ge=0)
    fees: float = Field(default=0, ge=0)
    transaction_date: datetime
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    portfolio_id: str
    ticker: str
    company_name: Optional[str]
    transaction_type: str
    quantity: float
    price_per_share: float
    total_amount: float
    fees: float
    transaction_date: str
    notes: Optional[str]
    created_at: str

class HoldingResponse(BaseModel):
    id: str
    portfolio_id: str
    ticker: str
    company_name: Optional[str]
    quantity: float
    avg_cost_basis: float
    total_cost: float
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_pct: Optional[float] = None
    first_purchase_date: Optional[str]
    last_transaction_date: Optional[str]
    notes: Optional[str]

class PortfolioSummary(BaseModel):
    portfolio_id: str
    total_value: float
    total_cost: float
    total_gain_loss: float
    gain_loss_pct: float
    num_holdings: int
    best_performer: Optional[dict] = None
    worst_performer: Optional[dict] = None
    sector_allocation: Optional[List[dict]] = None

# ============================================================================
# PORTFOLIO CRUD ENDPOINTS
# ============================================================================

@router.post("/portfolios", response_model=PortfolioResponse)
async def create_portfolio(
    portfolio: PortfolioCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Create a new portfolio
    """
    try:
        result = supabase.table("portfolios").insert({
            "user_id": current_user["id"],
            "name": portfolio.name,
            "description": portfolio.description,
            "currency": portfolio.currency,
            "is_default": portfolio.is_default,
        }).execute()

        if not result.data:
            raise HTTPException(
                status_code=400,
                detail="Failed to create portfolio"
            )

        return result.data[0]

    except Exception as e:
        import traceback

        print("=" * 60)
        print("PORTFOLIO CREATE ERROR")
        traceback.print_exc()
        print("=" * 60)

        if "unique_portfolio_name_per_user" in str(e):
            raise HTTPException(
                status_code=400,
                detail="Portfolio with this name already exists"
            )

        raise HTTPException(
            status_code=500,
            detail=f"Error creating portfolio: {str(e)}"
        )
    #except Exception as e:
       # if "unique_portfolio_name_per_user" in str(e):
        #   raise HTTPException(status_code=400, detail="Portfolio with this name already exists")
         #  raise HTTPException(status_code=500, detail=f"Error creating portfolio: {str(e)}")
    
@router.get("/portfolios", response_model=List[PortfolioResponse])
async def get_portfolios(
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get all portfolios for the current user
    """
    try:
        result = supabase.table("portfolios").select("*").eq(
            "user_id", current_user["id"]
        ).order("is_default", desc=True).order("created_at", desc=False).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching portfolios: {str(e)}")


@router.get("/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get a specific portfolio by ID
    """
    try:
        result = supabase.table("portfolios").select("*").eq("id", portfolio_id).eq(
            "user_id", current_user["id"]
        ).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching portfolio: {str(e)}")


@router.patch("/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: str,
    portfolio: PortfolioUpdate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Update a portfolio
    """
    try:
        # Build update data
        update_data = {}
        if portfolio.name is not None:
            update_data["name"] = portfolio.name
        if portfolio.description is not None:
            update_data["description"] = portfolio.description
        if portfolio.is_default is not None:
            update_data["is_default"] = portfolio.is_default
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update portfolio
        result = supabase.table("portfolios").update(update_data).eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating portfolio: {str(e)}")


@router.delete("/portfolios/{portfolio_id}")
async def delete_portfolio(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Delete a portfolio and all its holdings/transactions
    """
    try:
        # Delete portfolio (cascade will handle holdings and transactions)
        result = supabase.table("portfolios").delete().eq("id", portfolio_id).eq(
            "user_id", current_user["id"]
        ).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        return {"success": True, "message": "Portfolio deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting portfolio: {str(e)}")


# ============================================================================
# TRANSACTION ENDPOINTS
# ============================================================================

@router.post("/portfolios/{portfolio_id}/transactions", response_model=TransactionResponse)
async def add_transaction(
    portfolio_id: str,
    transaction: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Add a transaction to a portfolio
    Automatically updates holdings via database trigger
    """
    try:
        # Verify portfolio exists and user owns it
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Create transaction
        result = supabase.table("portfolio_transactions").insert({
            "portfolio_id": portfolio_id,
            "ticker": transaction.ticker.upper(),
            "company_name": transaction.company_name,
            "transaction_type": transaction.transaction_type,
            "quantity": transaction.quantity,
            "price_per_share": transaction.price_per_share,
            "fees": transaction.fees,
            "transaction_date": transaction.transaction_date.isoformat(),
            "notes": transaction.notes,
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create transaction")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding transaction: {str(e)}")


@router.get("/portfolios/{portfolio_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    portfolio_id: str,
    ticker: Optional[str] = Query(None, description="Filter by ticker"),
    transaction_type: Optional[str] = Query(None, description="Filter by type"),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get transactions for a portfolio with optional filters
    """
    try:
        # Verify portfolio exists and user owns it
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Build query
        query = supabase.table("portfolio_transactions").select("*").eq(
            "portfolio_id", portfolio_id
        )
        
        if ticker:
            query = query.eq("ticker", ticker.upper())
        if transaction_type:
            query = query.eq("transaction_type", transaction_type.upper())
        
        result = query.order("transaction_date", desc=True).limit(limit).execute()
        
        return result.data or []
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")


@router.delete("/portfolios/{portfolio_id}/transactions/{transaction_id}")
async def delete_transaction(
    portfolio_id: str,
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Delete a transaction (Note: Does NOT automatically recalculate holdings)
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Delete transaction
        result = supabase.table("portfolio_transactions").delete().eq(
            "id", transaction_id
        ).eq("portfolio_id", portfolio_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return {"success": True, "message": "Transaction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting transaction: {str(e)}")


# ============================================================================
# HOLDINGS ENDPOINTS
# ============================================================================

@router.get("/portfolios/{portfolio_id}/holdings", response_model=List[HoldingResponse])
async def get_holdings(
    portfolio_id: str,
    include_prices: bool = Query(True, description="Include current prices"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get all holdings for a portfolio with current prices and gains/losses
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Get holdings
        result = supabase.table("portfolio_holdings").select("*").eq(
            "portfolio_id", portfolio_id
        ).execute()
        
        holdings = result.data or []
        
        # Fetch current prices if requested
        if include_prices and holdings:
            from app.utils.market_data import get_market_data
            
            tickers = [h["ticker"] for h in holdings]
            prices = await get_market_data(tickers)
            
            # Calculate gains/losses
            for holding in holdings:
                ticker = holding["ticker"]
                if ticker in prices:
                    current_price = prices[ticker].get("price", 0)
                    holding["current_price"] = current_price
                    holding["current_value"] = float(holding["quantity"]) * current_price
                    holding["gain_loss"] = holding["current_value"] - float(holding["total_cost"])
                    
                    if float(holding["total_cost"]) > 0:
                        holding["gain_loss_pct"] = (holding["gain_loss"] / float(holding["total_cost"])) * 100
                    else:
                        holding["gain_loss_pct"] = 0
        
        return holdings
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching holdings: {str(e)}")


@router.get("/portfolios/{portfolio_id}/holdings/{ticker}", response_model=HoldingResponse)
async def get_holding(
    portfolio_id: str,
    ticker: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get a specific holding in a portfolio
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Get holding
        result = supabase.table("portfolio_holdings").select("*").eq(
            "portfolio_id", portfolio_id
        ).eq("ticker", ticker.upper()).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Holding not found")
        
        holding = result.data[0]
        
        # Fetch current price
        from app.utils.market_data import get_market_data
        
        prices = await get_market_data([ticker])
        if ticker.upper() in prices:
            current_price = prices[ticker.upper()].get("price", 0)
            holding["current_price"] = current_price
            holding["current_value"] = float(holding["quantity"]) * current_price
            holding["gain_loss"] = holding["current_value"] - float(holding["total_cost"])
            
            if float(holding["total_cost"]) > 0:
                holding["gain_loss_pct"] = (holding["gain_loss"] / float(holding["total_cost"])) * 100
        
        return holding
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching holding: {str(e)}")


@router.patch("/portfolios/{portfolio_id}/holdings/{ticker}")
async def update_holding_notes(
    portfolio_id: str,
    ticker: str,
    notes: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Update notes for a holding
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Update holding
        result = supabase.table("portfolio_holdings").update({
            "notes": notes
        }).eq("portfolio_id", portfolio_id).eq("ticker", ticker.upper()).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Holding not found")
        
        return {"success": True, "message": "Notes updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating holding: {str(e)}")


# ============================================================================
# PORTFOLIO SUMMARY & ANALYTICS
# ============================================================================

@router.get("/portfolios/{portfolio_id}/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get portfolio summary with totals, gains/losses, and analytics
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Get holdings
        holdings_result = supabase.table("portfolio_holdings").select("*").eq(
            "portfolio_id", portfolio_id
        ).execute()
        
        holdings = holdings_result.data or []
        
        if not holdings:
            return PortfolioSummary(
                portfolio_id=portfolio_id,
                total_value=0,
                total_cost=0,
                total_gain_loss=0,
                gain_loss_pct=0,
                num_holdings=0
            )
        
        # Fetch current prices
        from app.utils.market_data import get_market_data
        
        tickers = [h["ticker"] for h in holdings]
        prices = await get_market_data(tickers)
        
        # Calculate totals
        total_value = 0
        total_cost = 0
        best_performer = None
        worst_performer = None
        best_pct = float('-inf')
        worst_pct = float('inf')
        
        for holding in holdings:
            ticker = holding["ticker"]
            cost = float(holding["total_cost"])
            total_cost += cost
            
            if ticker in prices:
                current_price = prices[ticker].get("price", 0)
                value = float(holding["quantity"]) * current_price
                total_value += value
                
                gain_loss = value - cost
                gain_loss_pct = (gain_loss / cost * 100) if cost > 0 else 0
                
                if gain_loss_pct > best_pct:
                    best_pct = gain_loss_pct
                    best_performer = {
                        "ticker": ticker,
                        "gain_loss_pct": round(gain_loss_pct, 2)
                    }
                
                if gain_loss_pct < worst_pct:
                    worst_pct = gain_loss_pct
                    worst_performer = {
                        "ticker": ticker,
                        "gain_loss_pct": round(gain_loss_pct, 2)
                    }
        
        total_gain_loss = total_value - total_cost
        gain_loss_pct = (total_gain_loss / total_cost * 100) if total_cost > 0 else 0
        
        return PortfolioSummary(
            portfolio_id=portfolio_id,
            total_value=round(total_value, 2),
            total_cost=round(total_cost, 2),
            total_gain_loss=round(total_gain_loss, 2),
            gain_loss_pct=round(gain_loss_pct, 2),
            num_holdings=len(holdings),
            best_performer=best_performer,
            worst_performer=worst_performer
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating summary: {str(e)}")


@router.get("/portfolios/{portfolio_id}/analytics")
async def get_portfolio_analytics(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get detailed portfolio analytics including sector allocation,
    position sizes, diversification score, and performance metrics
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Get holdings
        holdings_result = supabase.table("portfolio_holdings").select("*").eq(
            "portfolio_id", portfolio_id
        ).execute()
        
        holdings = holdings_result.data or []
        
        if not holdings:
            return {
                "portfolio_id": portfolio_id,
                "summary": {
                    "total_value": 0,
                    "total_cost": 0,
                    "gain_loss": 0,
                    "gain_loss_pct": 0
                },
                "sector_allocation": [],
                "position_sizes": [],
                "diversification": {
                    "score": 0,
                    "num_holdings": 0,
                    "concentration_risk": "High",
                    "largest_position_pct": 0
                },
                "best_performer": None,
                "worst_performer": None
            }
        
        # Fetch current prices
        from app.utils.market_data import get_market_data
        from app.utils.portfolio_analytics import calculate_portfolio_metrics
        
        tickers = [h["ticker"] for h in holdings]
        prices = await get_market_data(tickers)
        
        # Calculate all metrics
        metrics = await calculate_portfolio_metrics(holdings, prices)
        
        return {
            "portfolio_id": portfolio_id,
            **metrics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating analytics: {str(e)}")


@router.get("/portfolios/{portfolio_id}/performance")
async def get_portfolio_performance(
    portfolio_id: str,
    period: str = Query("all_time", regex="^(all_time|1y|3m|1m|1w)$"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Get portfolio performance metrics for a specific time period
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Get snapshots for the period
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        if period == "1w":
            start_date = end_date - timedelta(days=7)
        elif period == "1m":
            start_date = end_date - timedelta(days=30)
        elif period == "3m":
            start_date = end_date - timedelta(days=90)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        else:
            # all_time
            start_date = datetime(2000, 1, 1)
        
        snapshots_result = supabase.table("portfolio_snapshots").select("*").eq(
            "portfolio_id", portfolio_id
        ).gte("snapshot_date", start_date.date().isoformat()).order(
            "snapshot_date", desc=False
        ).execute()
        
        snapshots = snapshots_result.data or []
        
        from app.utils.portfolio_analytics import calculate_performance_over_time
        
        performance = calculate_performance_over_time(snapshots)
        performance["period"] = period
        
        return performance
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating performance: {str(e)}")


@router.get("/portfolios/{portfolio_id}/realized-gains")
async def get_realized_gains(
    portfolio_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_db)
):
    """
    Calculate realized gains/losses from sell transactions
    """
    try:
        # Verify portfolio ownership
        portfolio_result = supabase.table("portfolios").select("id").eq(
            "id", portfolio_id
        ).eq("user_id", current_user["id"]).execute()
        
        if not portfolio_result.data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        # Get all transactions
        transactions_result = supabase.table("portfolio_transactions").select("*").eq(
            "portfolio_id", portfolio_id
        ).order("transaction_date", desc=False).execute()
        
        transactions = transactions_result.data or []
        
        from app.utils.portfolio_analytics import calculate_realized_gains
        
        realized = calculate_realized_gains(transactions)
        
        return {
            "portfolio_id": portfolio_id,
            **realized
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating realized gains: {str(e)}")
