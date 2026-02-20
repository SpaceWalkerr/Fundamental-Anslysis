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
from app.db.database import get_supabase_client

# Popular stocks to fetch (can be expanded)
POPULAR_STOCKS = [
    # Technology
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "NFLX", "ADBE", "CRM",
    "ORCL", "INTC", "AMD", "QCOM", "AVGO", "TXN", "IBM", "NOW", "INTU", "CSCO",
    
    # Finance
    "JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "V",
    "MA", "PYPL", "SQ", "COF", "USB", "PNC", "TFC", "BK", "STT", "SPGI",
    
    # Healthcare
    "JNJ", "UNH", "PFE", "ABBV", "TMO", "ABT", "MRK", "LLY", "DHR", "BMY",
    "AMGN", "GILD", "CVS", "CI", "HUM", "ISRG", "VRTX", "REGN", "ZTS", "BIIB",
    
    # Consumer  
    "WMT", "HD", "NKE", "MCD", "SBUX", "TGT", "LOW", "COST", "DIS", "CMCSA",
    "PEP", "KO", "PM", "PG", "CL", "EL", "KMB", "CHD", "CLX", "TSN",
    
    # Industrial
    "BA", "CAT", "GE", "HON", "UNP", "UPS", "MMM", "LMT", "RTX", "DE",
    
    # Energy
    "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "HAL",
    
    # Other
    "BRK.B", "VZ", "T", "NEE", "DUK"
]

async def populate_stocks():
    """Fetch and save stock data"""
    print("=" * 60)
    print("Stock Database Population Script")
    print("=" * 60)
    print(f"\nFetching data for {len(POPULAR_STOCKS)} popular stocks...")
    print("This may take several minutes due to API rate limits.\n")
    
    # Initialize services
    stock_service = get_stock_data_service()
    db = get_supabase_client()
    
    if not stock_service.alpha_vantage_key and not stock_service.fmp_key:
        print("❌ ERROR: No stock data API key configured!")
        print("\nPlease add one of the following to your .env file:")
        print("  - ALPHA_VANTAGE_API_KEY (free at https://www.alphavantage.co/support/#api-key)")
        print("  - FMP_API_KEY (free at https://site.financialmodelingprep.com/developer/docs)")
        return
    
    success_count = 0
    error_count = 0
    
    for i, ticker in enumerate(POPULAR_STOCKS, 1):
        try:
            print(f"[{i}/{len(POPULAR_STOCKS)}] Fetching {ticker}...", end=" ")
            
            # Get company data
            overview = await stock_service.get_company_overview(ticker)
            
            if overview:
                # Save to database
                db.table('stocks').upsert(overview).execute()
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
    print("Testing API connection...")
    stock_service = get_stock_data_service()
    
    try:
        result = await stock_service.get_company_overview("AAPL")
        if result:
            print(f"✓ API connection successful!")
            print(f"  Test fetch: {result.get('name')} ({result.get('ticker')})")
            print(f"  Price: ${result.get('price', 'N/A')}")
            print(f"  Market Cap: ${result.get('market_cap', 'N/A')}\n")
            return True
        else:
            print("✗ API returned no data")
            return False
    except Exception as e:
        print(f"✗ API test failed: {e}")
        return False


async def main():
    """Main entry point"""
    # Test API first
    if not await test_api_connection():
        print("\n❌ API connection test failed. Please check your API keys.")
        return
    
    # Ask for confirmation
    print("This script will fetch data for 100+ stocks.")
    response = input("\nProceed? (y/n): ")
    
    if response.lower() == 'y':
        await populate_stocks()
    else:
        print("❌ Cancelled.")


if __name__ == "__main__":
    asyncio.run(main())
