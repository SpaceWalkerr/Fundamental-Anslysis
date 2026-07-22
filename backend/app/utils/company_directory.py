"""
Offline company directory.

The live search uses FMP / Alpha Vantage when a key is configured. When it
isn't (or returns nothing), we fall back to this curated list of widely-held
Indian and US names so the search box stays useful instead of dead-ending.
It's for identifying a company before uploading its report — not live quotes.
"""
from typing import List, Dict

_COMPANIES = [
    # India (NSE)
    ("RELIANCE", "Reliance Industries Ltd", "Energy / Conglomerate"),
    ("TCS", "Tata Consultancy Services Ltd", "Information Technology"),
    ("INFY", "Infosys Ltd", "Information Technology"),
    ("HDFCBANK", "HDFC Bank Ltd", "Banking"),
    ("ICICIBANK", "ICICI Bank Ltd", "Banking"),
    ("HINDUNILVR", "Hindustan Unilever Ltd", "FMCG"),
    ("BHARTIARTL", "Bharti Airtel Ltd", "Telecom"),
    ("ITC", "ITC Ltd", "FMCG"),
    ("SBIN", "State Bank of India", "Banking"),
    ("LT", "Larsen & Toubro Ltd", "Infrastructure"),
    ("KOTAKBANK", "Kotak Mahindra Bank Ltd", "Banking"),
    ("BAJFINANCE", "Bajaj Finance Ltd", "Financial Services"),
    ("ASIANPAINT", "Asian Paints Ltd", "Consumer"),
    ("MARUTI", "Maruti Suzuki India Ltd", "Automobile"),
    ("TITAN", "Titan Company Ltd", "Consumer"),
    ("SUNPHARMA", "Sun Pharmaceutical Industries Ltd", "Pharmaceuticals"),
    ("WIPRO", "Wipro Ltd", "Information Technology"),
    ("HCLTECH", "HCL Technologies Ltd", "Information Technology"),
    ("ADANIENT", "Adani Enterprises Ltd", "Conglomerate"),
    ("TATAMOTORS", "Tata Motors Ltd", "Automobile"),
    ("AXISBANK", "Axis Bank Ltd", "Banking"),
    ("NESTLEIND", "Nestle India Ltd", "FMCG"),
    ("ULTRACEMCO", "UltraTech Cement Ltd", "Cement"),
    ("ONGC", "Oil & Natural Gas Corporation Ltd", "Energy"),
    ("POWERGRID", "Power Grid Corporation of India Ltd", "Utilities"),
    # US
    ("AAPL", "Apple Inc.", "Technology"),
    ("MSFT", "Microsoft Corporation", "Technology"),
    ("GOOGL", "Alphabet Inc.", "Technology"),
    ("AMZN", "Amazon.com Inc.", "Consumer / Cloud"),
    ("NVDA", "NVIDIA Corporation", "Semiconductors"),
    ("META", "Meta Platforms Inc.", "Technology"),
    ("TSLA", "Tesla Inc.", "Automobile"),
    ("BRK.B", "Berkshire Hathaway Inc.", "Conglomerate"),
    ("JPM", "JPMorgan Chase & Co.", "Banking"),
    ("V", "Visa Inc.", "Financial Services"),
    ("JNJ", "Johnson & Johnson", "Healthcare"),
    ("WMT", "Walmart Inc.", "Retail"),
    ("PG", "Procter & Gamble Co.", "Consumer"),
    ("MA", "Mastercard Inc.", "Financial Services"),
    ("KO", "Coca-Cola Co.", "Beverages"),
    ("DIS", "Walt Disney Co.", "Media"),
    ("NFLX", "Netflix Inc.", "Media"),
    ("INTC", "Intel Corporation", "Semiconductors"),
    ("AMD", "Advanced Micro Devices Inc.", "Semiconductors"),
]


def search_directory(query: str, limit: int = 10) -> List[Dict]:
    q = (query or "").strip().lower()
    if not q:
        return []
    hits = []
    for ticker, name, sector in _COMPANIES:
        if q in ticker.lower() or q in name.lower():
            hits.append({"ticker": ticker, "name": name, "sector": sector})
        if len(hits) >= limit:
            break
    return hits
