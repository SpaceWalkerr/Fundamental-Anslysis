"""
Sample stock universe for the screener.

The live screener reads the Supabase `stocks` table (populated by a data
pipeline / populate_stocks.py). When that table is empty — e.g. before a data
feed is wired up — we fall back to this curated set so the screener actually
demonstrates value instead of returning nothing. Figures are illustrative.
"""
from typing import Any, Dict, List

# Fields align with the screener filter set: sector, market_cap, pe_ratio,
# revenue_growth, profit_margin, roe, debt_to_equity, dividend_yield,
# current_ratio. market_cap is a number (USD) for filtering; market_cap_label
# is the display string.
SAMPLE_STOCKS: List[Dict[str, Any]] = [
    {"ticker": "AAPL", "company": "Apple Inc.", "sector": "Technology", "price": 225.5, "market_cap": 2800000000000, "market_cap_label": "2.8T", "pe_ratio": 28.5, "revenue_growth": 2.8, "profit_margin": 25.5, "roe": 147.0, "debt_to_equity": 1.5, "dividend_yield": 0.5, "current_ratio": 0.9},
    {"ticker": "MSFT", "company": "Microsoft Corporation", "sector": "Technology", "price": 415.2, "market_cap": 3100000000000, "market_cap_label": "3.1T", "pe_ratio": 34.0, "revenue_growth": 16.2, "profit_margin": 35.8, "roe": 39.0, "debt_to_equity": 0.4, "dividend_yield": 0.7, "current_ratio": 1.3},
    {"ticker": "NVDA", "company": "NVIDIA Corporation", "sector": "Technology", "price": 880.2, "market_cap": 2200000000000, "market_cap_label": "2.2T", "pe_ratio": 65.2, "revenue_growth": 126.0, "profit_margin": 52.1, "roe": 91.0, "debt_to_equity": 0.2, "dividend_yield": 0.03, "current_ratio": 4.2},
    {"ticker": "GOOGL", "company": "Alphabet Inc.", "sector": "Communication Services", "price": 168.0, "market_cap": 2100000000000, "market_cap_label": "2.1T", "pe_ratio": 24.0, "revenue_growth": 13.0, "profit_margin": 27.0, "roe": 29.0, "debt_to_equity": 0.1, "dividend_yield": 0.0, "current_ratio": 2.1},
    {"ticker": "META", "company": "Meta Platforms Inc.", "sector": "Communication Services", "price": 505.0, "market_cap": 1300000000000, "market_cap_label": "1.3T", "pe_ratio": 27.0, "revenue_growth": 22.0, "profit_margin": 34.0, "roe": 34.0, "debt_to_equity": 0.3, "dividend_yield": 0.4, "current_ratio": 2.7},
    {"ticker": "JPM", "company": "JPMorgan Chase & Co.", "sector": "Financials", "price": 205.0, "market_cap": 590000000000, "market_cap_label": "590B", "pe_ratio": 12.0, "revenue_growth": 12.0, "profit_margin": 32.0, "roe": 17.0, "debt_to_equity": 1.2, "dividend_yield": 2.2, "current_ratio": 1.1},
    {"ticker": "JNJ", "company": "Johnson & Johnson", "sector": "Healthcare", "price": 155.0, "market_cap": 375000000000, "market_cap_label": "375B", "pe_ratio": 15.0, "revenue_growth": 4.0, "profit_margin": 18.0, "roe": 24.0, "debt_to_equity": 0.5, "dividend_yield": 3.1, "current_ratio": 1.1},
    {"ticker": "PG", "company": "Procter & Gamble Co.", "sector": "Consumer Discretionary", "price": 165.0, "market_cap": 390000000000, "market_cap_label": "390B", "pe_ratio": 26.0, "revenue_growth": 3.5, "profit_margin": 18.5, "roe": 31.0, "debt_to_equity": 0.6, "dividend_yield": 2.4, "current_ratio": 0.7},
    {"ticker": "KO", "company": "Coca-Cola Co.", "sector": "Consumer Discretionary", "price": 62.0, "market_cap": 268000000000, "market_cap_label": "268B", "pe_ratio": 24.0, "revenue_growth": 3.0, "profit_margin": 23.0, "roe": 40.0, "debt_to_equity": 1.6, "dividend_yield": 3.1, "current_ratio": 1.1},
    {"ticker": "WMT", "company": "Walmart Inc.", "sector": "Consumer Discretionary", "price": 68.0, "market_cap": 545000000000, "market_cap_label": "545B", "pe_ratio": 30.0, "revenue_growth": 6.0, "profit_margin": 2.5, "roe": 20.0, "debt_to_equity": 0.6, "dividend_yield": 1.3, "current_ratio": 0.8},
    {"ticker": "XOM", "company": "Exxon Mobil Corporation", "sector": "Energy", "price": 115.0, "market_cap": 460000000000, "market_cap_label": "460B", "pe_ratio": 13.5, "revenue_growth": -3.0, "profit_margin": 10.5, "roe": 18.0, "debt_to_equity": 0.2, "dividend_yield": 3.3, "current_ratio": 1.3},
    {"ticker": "TSLA", "company": "Tesla Inc.", "sector": "Consumer Discretionary", "price": 250.0, "market_cap": 800000000000, "market_cap_label": "800B", "pe_ratio": 62.0, "revenue_growth": 19.0, "profit_margin": 15.0, "roe": 22.0, "debt_to_equity": 0.1, "dividend_yield": 0.0, "current_ratio": 1.7},
    # India
    {"ticker": "RELIANCE", "company": "Reliance Industries Ltd", "sector": "Energy", "price": 2950.0, "market_cap": 240000000000, "market_cap_label": "20L Cr", "pe_ratio": 25.0, "revenue_growth": 8.0, "profit_margin": 8.5, "roe": 9.0, "debt_to_equity": 0.4, "dividend_yield": 0.4, "current_ratio": 1.1},
    {"ticker": "TCS", "company": "Tata Consultancy Services Ltd", "sector": "Technology", "price": 3900.0, "market_cap": 175000000000, "market_cap_label": "14L Cr", "pe_ratio": 30.0, "revenue_growth": 7.0, "profit_margin": 19.0, "roe": 47.0, "debt_to_equity": 0.1, "dividend_yield": 1.4, "current_ratio": 2.5},
    {"ticker": "INFY", "company": "Infosys Ltd", "sector": "Technology", "price": 1650.0, "market_cap": 85000000000, "market_cap_label": "7L Cr", "pe_ratio": 24.0, "revenue_growth": 6.0, "profit_margin": 17.0, "roe": 32.0, "debt_to_equity": 0.1, "dividend_yield": 2.2, "current_ratio": 2.3},
    {"ticker": "HDFCBANK", "company": "HDFC Bank Ltd", "sector": "Financials", "price": 1650.0, "market_cap": 150000000000, "market_cap_label": "12L Cr", "pe_ratio": 19.0, "revenue_growth": 20.0, "profit_margin": 26.0, "roe": 17.0, "debt_to_equity": 1.1, "dividend_yield": 1.1, "current_ratio": 1.0},
    {"ticker": "ITC", "company": "ITC Ltd", "sector": "Consumer Discretionary", "price": 460.0, "market_cap": 68000000000, "market_cap_label": "5.7L Cr", "pe_ratio": 27.0, "revenue_growth": 6.0, "profit_margin": 25.0, "roe": 28.0, "debt_to_equity": 0.0, "dividend_yield": 3.2, "current_ratio": 2.8},
    {"ticker": "SUNPHARMA", "company": "Sun Pharmaceutical Industries Ltd", "sector": "Healthcare", "price": 1750.0, "market_cap": 52000000000, "market_cap_label": "4.2L Cr", "pe_ratio": 38.0, "revenue_growth": 10.0, "profit_margin": 17.0, "roe": 16.0, "debt_to_equity": 0.1, "dividend_yield": 0.8, "current_ratio": 2.0},
    {"ticker": "MARUTI", "company": "Maruti Suzuki India Ltd", "sector": "Consumer Discretionary", "price": 12500.0, "market_cap": 47000000000, "market_cap_label": "3.9L Cr", "pe_ratio": 28.0, "revenue_growth": 14.0, "profit_margin": 9.0, "roe": 16.0, "debt_to_equity": 0.0, "dividend_yield": 0.9, "current_ratio": 0.9},
    {"ticker": "ASIANPAINT", "company": "Asian Paints Ltd", "sector": "Materials", "price": 2900.0, "market_cap": 33000000000, "market_cap_label": "2.8L Cr", "pe_ratio": 55.0, "revenue_growth": 4.0, "profit_margin": 13.0, "roe": 28.0, "debt_to_equity": 0.1, "dividend_yield": 1.1, "current_ratio": 1.8},
]

_OPS = {
    "eq": lambda a, b: str(a).lower() == str(b).lower(),
    "neq": lambda a, b: str(a).lower() != str(b).lower(),
    "gt": lambda a, b: _num(a) > _num(b),
    "gte": lambda a, b: _num(a) >= _num(b),
    "lt": lambda a, b: _num(a) < _num(b),
    "lte": lambda a, b: _num(a) <= _num(b),
}


def _num(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return float("nan")


def _passes(stock: Dict, f: Dict) -> bool:
    field, op, value = f.get("field"), f.get("operator"), f.get("value")
    if field not in stock or op not in _OPS:
        return True
    try:
        return _OPS[op](stock.get(field), value)
    except Exception:
        return True


# Which sample tickers are Indian (the rest are US).
_INDIA = {"RELIANCE", "TCS", "INFY", "HDFCBANK", "ITC", "SUNPHARMA", "MARUTI", "ASIANPAINT"}


def _market_of(ticker: str) -> str:
    return "india" if ticker in _INDIA else "us"


def screen_sample(filters: List[Dict], sort_by: str, sort_order: str, limit: int, market: str = None) -> List[Dict]:
    """Filter + sort the sample universe entirely in Python (returns copies)."""
    matches = []
    for s in SAMPLE_STOCKS:
        mkt = _market_of(s["ticker"])
        if market and mkt != market:
            continue
        if all(_passes(s, f) for f in (filters or [])):
            row = dict(s)
            row["name"] = s["company"]        # endpoint maps `name`
            row["market"] = mkt
            row["match_score"] = _score(s, filters)
            matches.append(row)
    key = "market_cap"
    if sort_by in ("match_score", "matchScore"):
        key = "match_score"
    elif sort_by in (SAMPLE_STOCKS[0] if SAMPLE_STOCKS else {}):
        key = sort_by
    try:
        matches.sort(key=lambda x: _num(x.get(key, 0)), reverse=(sort_order != "asc"))
    except Exception:
        pass
    return matches[:limit]


def _score(stock: Dict, filters: List[Dict]) -> int:
    if not filters:
        return 85
    passed = sum(1 for f in filters if _passes(stock, f))
    return int(70 + (passed / max(1, len(filters))) * 30)
