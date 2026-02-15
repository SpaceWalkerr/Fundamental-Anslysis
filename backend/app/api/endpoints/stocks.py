"""
Stocks API Endpoints
Handles company search and stock screening
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client
from typing import List, Optional

from app.db.database import get_db
from app.models.schemas import (
    CompanySearch,
    StockScreenerRequest,
    StockScreenerResponse,
    StockScreenerResult,
)
from app.core.security import get_current_active_user, require_premium


router = APIRouter()


# Mock company data
MOCK_COMPANIES = [
    {
        "id": "1",
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "sector": "Technology",
        "price": 225.50,
        "change_percent": 2.5,
        "pe_ratio": 28.5,
        "revenue_growth": 2.8,
        "profit_margin": 25.5,
        "market_cap": "$2.8T",
    },
    {
        "id": "2",
        "name": "Microsoft Corporation",
        "ticker": "MSFT",
        "sector": "Technology",
        "price": 415.25,
        "change_percent": 1.8,
        "pe_ratio": 28.5,
        "revenue_growth": 16.2,
        "profit_margin": 35.8,
        "market_cap": "$3.1T",
    },
    {
        "id": "3",
        "name": "NVIDIA Corporation",
        "ticker": "NVDA",
        "sector": "Technology",
        "price": 880.25,
        "change_percent": 3.2,
        "pe_ratio": 65.2,
        "revenue_growth": 126.0,
        "profit_margin": 52.1,
        "market_cap": "$2.2T",
    },
    {
        "id": "4",
        "name": "Alphabet Inc.",
        "ticker": "GOOGL",
        "sector": "Technology",
        "price": 178.90,
        "change_percent": -0.5,
        "pe_ratio": 22.5,
        "revenue_growth": 11.0,
        "profit_margin": 24.0,
        "market_cap": "$2.2T",
    },
    {
        "id": "5",
        "name": "Amazon.com Inc.",
        "ticker": "AMZN",
        "sector": "Consumer Discretionary",
        "price": 195.80,
        "change_percent": 2.1,
        "pe_ratio": 42.3,
        "revenue_growth": 10.5,
        "profit_margin": 3.2,
        "market_cap": "$2.0T",
    },
    {
        "id": "6",
        "name": "Tesla Inc.",
        "ticker": "TSLA",
        "sector": "Industrials",
        "price": 285.20,
        "change_percent": -1.2,
        "pe_ratio": 35.8,
        "revenue_growth": 1.8,
        "profit_margin": 10.5,
        "market_cap": "$900B",
    },
]


@router.get("/search", response_model=List[CompanySearch])
async def search_companies(
    query: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Search for companies by name or ticker
    """
    query_lower = query.lower()
    
    # Filter companies
    results = [
        CompanySearch(**company)
        for company in MOCK_COMPANIES
        if query_lower in company['name'].lower() or query_lower in company['ticker'].lower()
    ]
    
    # TODO: Replace with actual database query
    # SELECT * FROM stocks 
    # WHERE name ILIKE %query% OR ticker ILIKE %query%
    # LIMIT limit
    
    return results[:limit]


@router.post("/screener", response_model=StockScreenerResponse)
async def run_stock_screener(
    request: StockScreenerRequest,
    current_user: dict = Depends(require_premium),  # Premium feature
    db: Client = Depends(get_db)
):
    """
    Run stock screener with custom filters (Premium feature)
    """
    # TODO: Implement actual database query
    # This would build a dynamic SQL query based on filters
    
    # Mock results for now
    mock_results = [
        StockScreenerResult(
            ticker="MSFT",
            company="Microsoft Corporation",
            sector="Technology",
            price=415.25,
            market_cap="$3.1T",
            pe_ratio=28.5,
            revenue_growth=16.2,
            profit_margin=35.8,
            match_score=95,
        ),
        StockScreenerResult(
            ticker="AAPL",
            company="Apple Inc.",
            sector="Technology",
            price=225.50,
            market_cap="$2.8T",
            pe_ratio=28.5,
            revenue_growth=2.8,
            profit_margin=25.5,
            match_score=88,
        ),
        StockScreenerResult(
            ticker="NVDA",
            company="NVIDIA Corporation",
            sector="Technology",
            price=880.25,
            market_cap="$2.2T",
            pe_ratio=65.2,
            revenue_growth=126.0,
            profit_margin=52.1,
            match_score=85,
        ),
    ]
    
    # Apply filters (simplified)
    filtered_results = mock_results
    
    # In real implementation:
    # 1. Build SQL WHERE clause from filters
    # 2. Execute query
    # 3. Calculate match scores
    # 4. Sort and limit results
    
    return StockScreenerResponse(
        total=len(filtered_results),
        results=filtered_results,
        filters_applied=request.filters
    )


@router.get("/details/{ticker}")
async def get_stock_details(
    ticker: str,
    current_user: dict = Depends(get_current_active_user),
    db: Client = Depends(get_db)
):
    """
    Get detailed stock information
    """
    # Find stock in mock data
    stock = next((s for s in MOCK_COMPANIES if s['ticker'] == ticker.upper()), None)
    
    if not stock:
        # TODO: Query real database
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock {ticker} not found"
        )
    
    return stock
