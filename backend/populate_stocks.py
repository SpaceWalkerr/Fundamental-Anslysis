#!/usr/bin/env python3
"""
Populate Stock Database Script
Fetches data for popular stocks and saves to database
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.stock_data_service import get_stock_data_service
from app.db.database import get_supabase_admin_client

# Popular Indian stocks to fetch (Yahoo Finance format)
# Format: SYMBOL.NS for NSE (National Stock Exchange)
POPULAR_STOCKS = [
    # Large Cap - Technology & IT
    "TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS",
    "LTI.NS", "COFORGE.NS", "PERSISTENT.NS", "MPHASIS.NS",
    
    # Large Cap - Banking & Finance
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS",
    "BAJFINANCE.NS", "BAJAJFINSV.NS", "INDUSINDBK.NS", "ICICIGI.NS", "HDFCLIFE.NS",
    
    # Large Cap - Energy & Oil
    "RELIANCE.NS", "ONGC.NS", "BPCL.NS", "IOC.NS", "GAIL.NS",
    "ADANIGREEN.NS", "ADANIPOWER.NS", "TATAPOWER.NS", "NTPC.NS", "POWERGRID.NS",
    
    # Large Cap - FMCG & Consumer
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "DABUR.NS",
    "GODREJCP.NS", "MARICO.NS", "TATACONSUM.NS", "COLPAL.NS",
    
    # Large Cap - Pharma & Healthcare
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "BIOCON.NS",
    "AUROPHARMA.NS", "LUPIN.NS", "TORNTPHARM.NS", "APOLLOHOSP.NS",
    
    # Large Cap - Auto & Manufacturing
    "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS", "EICHERMOT.NS",
    "HEROMOTOCO.NS", "ASHOKLEY.NS", "TVSMOTOR.NS", "BHARATFORG.NS",
    
    # Large Cap - Metals & Mining
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS", "COALINDIA.NS",
    "SAIL.NS", "NMDC.NS", "JINDALSTEL.NS",
    
    # Large Cap - Infrastructure & Cement
    "LT.NS", "ULTRACEMCO.NS", "GRASIM.NS", "AMBUJACEM.NS", "ACC.NS",
    "ADANIPORTS.NS", "DLF.NS", "GODREJPROP.NS",
    
    # Large Cap - Telecom & Media
    "BHARTIARTL.NS", "ZEEL.NS", "SUNTV.NS",
    
    # Mid Cap - Emerging Stars
    "ADANIENT.NS", "BERGEPAINT.NS", "HAVELLS.NS", "PIDILITIND.NS",
    "SIEMENS.NS", "ABB.NS", "BOSCHLTD.NS", "CUMMINSIND.NS",
]

async def populate_stocks():
    """Fetch and save stock data"""
    print("=" * 60)
    print("Stock Database Population Script - Indian Markets (NSE)")
    print("=" * 60)
    print(f"\nFetching data for {len(POPULAR_STOCKS)} popular Indian stocks...")
    print("This may take several minutes.\n")
    
    # Initialize services
    stock_service = get_stock_data_service()
    db = get_supabase_admin_client()
    
    # Yahoo Finance doesn't need API keys!
    print("Using Yahoo Finance API (no API key required)\n")
    
    success_count = 0
    error_count = 0
    
    for i, ticker in enumerate(POPULAR_STOCKS, 1):
        try:
            print(f"[{i}/{len(POPULAR_STOCKS)}] Fetching {ticker}...", end=" ")
            
            # Get company data
            overview = await stock_service.get_company_overview(ticker)
            
            if overview:
                # Save to database
                db.table('stocks').upsert(overview, on_conflict='ticker').execute()
                print(f"✓ {overview.get('name', ticker)}")
                success_count += 1
            else:
                print(f"✗ No data returned")
                error_count += 1
                
        except Exception as e:
            print(f"✗ Error: {str(e)[:50]}")
            error_count += 1
        
        # Progress update every 10 stocks
        if i % 10 == 0:
            print(f"\nProgress: {success_count} successful, {error_count} errors\n")
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✓ Successfully fetched: {success_count}")
    print(f"✗ Errors: {error_count}")
    print(f"📊 Total stocks in database: {success_count}")
    print("\n✅ Database population complete!")
    print("\nYou can now use the stock scanner with real data.")


async def test_api_connection():
    """Test API connection before bulk fetch"""
    print("Testing Yahoo Finance connection...")
    stock_service = get_stock_data_service()
    
    try:
        # Test with TCS (Indian stock)
        result = await stock_service.get_company_overview("TCS.NS")
        if result:
            print(f"✓ Yahoo Finance connection successful!")
            print(f"  Test fetch: {result.get('name')} ({result.get('ticker')})")
            print(f"  Price: ₹{result.get('price', 'N/A')}")
            print(f"  Market Cap: ₹{result.get('market_cap', 'N/A')}\n")
            return True
        else:
            print("✗ Yahoo Finance returned no data")
            return False
    except Exception as e:
        print(f"✗ API test failed: {e}")
        return False


async def main():
    """Main entry point"""
    # Test API first
    if not await test_api_connection():
        print("\n❌ Yahoo Finance connection test failed.")
        return
    
    # Ask for confirmation
    print(f"This script will fetch data for {len(POPULAR_STOCKS)} Indian stocks from NSE.")
    response = input("\nProceed? (y/n): ")
    
    if response.lower() == 'y':
        await populate_stocks()
    else:
        print("❌ Cancelled.")


if __name__ == "__main__":
    asyncio.run(main())
