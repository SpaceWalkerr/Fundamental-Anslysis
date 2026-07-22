"""
Stock Screening Engine
Filters and ranks stocks based on user criteria
"""
from typing import List, Dict, Optional, Any
from supabase import Client
from datetime import datetime, timedelta
import hashlib
import json


class StockScreener:
    """
    Advanced stock screening engine with dynamic filters
    """
    
    def __init__(self, db: Client):
        """Initialize screener with database connection"""
        self.db = db
        self.cache_duration_minutes = 30
    
    def screen_stocks(
        self,
        filters: List[Dict[str, Any]],
        sort_by: str = "market_cap",
        sort_order: str = "desc",
        limit: int = 100,
        use_cache: bool = True,
        market: str = "india",
    ) -> Dict:
        """
        Screen stocks based on filters
        
        Args:
            filters: List of filter conditions
                Example: [
                    {"field": "sector", "operator": "eq", "value": "Technology"},
                    {"field": "pe_ratio", "operator": "lt", "value": 30},
                    {"field": "market_cap", "operator": "gt", "value": 1000000000}
                ]
            sort_by: Field to sort results by
            sort_order: "asc" or "desc"
            limit: Maximum number of results
            use_cache: Whether to use cached results
            
        Returns:
            Dict with results and metadata
        """
        # Check cache first
        if use_cache:
            cached = self._get_cached_results(filters, sort_by, sort_order)
            if cached:
                return cached
        
        # Build query — scoped to the selected market.
        query = self.db.table('stocks').select('*').eq('is_active', True)
        if market:
            query = query.eq('market', market)

        # Apply filters
        for filter_item in filters:
            query = self._apply_filter(query, filter_item)
        
        # Apply sorting
        query = query.order(sort_by, desc=(sort_order == "desc"))
        
        # Apply limit
        query = query.limit(limit)
        
        # Execute query
        try:
            result = query.execute()
            stocks = result.data if result.data else []

            # Fallback: if the `stocks` table isn't populated yet, screen a
            # curated sample universe so the scanner still returns real,
            # useful results instead of an empty list.
            if not stocks:
                from app.utils.sample_stocks import screen_sample
                sample = screen_sample(filters, sort_by, sort_order, limit, market=market)
                return {
                    "results": sample,
                    "total_count": len(sample),
                    "filters_applied": len(filters),
                    "cached": False,
                    "sample_data": True,
                    "last_updated": datetime.utcnow().isoformat(),
                }

            # Calculate additional metrics
            for stock in stocks:
                stock['match_score'] = self._calculate_match_score(stock, filters)
            
            # Sort by match score if multiple filters
            if len(filters) > 1:
                stocks = sorted(stocks, key=lambda x: x.get('match_score', 0), reverse=True)
            
            response = {
                "results": stocks[:limit],
                "total_count": len(stocks),
                "filters_applied": len(filters),
                "cached": False,
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Cache results
            if use_cache:
                self._cache_results(filters, sort_by, sort_order, response)
            
            return response
            
        except Exception as e:
            print(f"Screening error: {e}")
            return {
                "results": [],
                "total_count": 0,
                "error": str(e)
            }
    
    def _apply_filter(self, query, filter_item: Dict) -> Any:
        """Apply a single filter to the query"""
        field = filter_item.get('field')
        operator = filter_item.get('operator')
        value = filter_item.get('value')
        
        if not field or not operator:
            return query
        
        # Map operators to Supabase methods
        if operator == "eq":
            return query.eq(field, value)
        elif operator == "neq":
            return query.neq(field, value)
        elif operator == "gt":
            return query.gt(field, value)
        elif operator == "gte":
            return query.gte(field, value)
        elif operator == "lt":
            return query.lt(field, value)
        elif operator == "lte":
            return query.lte(field, value)
        elif operator == "in":
            return query.in_(field, value if isinstance(value, list) else [value])
        elif operator == "contains":
            return query.ilike(field, f"%{value}%")
        else:
            return query
    
    def _calculate_match_score(self, stock: Dict, filters: List[Dict]) -> float:
        """
        Calculate how well a stock matches the filter criteria
        Returns score from 0-100
        """
        if not filters:
            return 100.0
        
        total_score = 0
        scored_filters = 0
        
        for filter_item in filters:
            field = filter_item.get('field')
            operator = filter_item.get('operator')
            value = filter_item.get('value')
            
            stock_value = stock.get(field)
            
            if stock_value is None:
                continue
            
            # Calculate individual filter score
            filter_score = self._score_filter_match(
                stock_value, operator, value, field
            )
            
            total_score += filter_score
            scored_filters += 1
        
        return (total_score / scored_filters) if scored_filters > 0 else 50.0
    
    def _score_filter_match(
        self,
        stock_value: Any,
        operator: str,
        target_value: Any,
        field: str
    ) -> float:
        """Score how well a value matches filter criteria (0-100)"""
        
        try:
            # For exact matches
            if operator == "eq":
                return 100.0 if stock_value == target_value else 0.0
            
            # For numeric comparisons
            if operator in ["gt", "gte", "lt", "lte"]:
                stock_num = float(stock_value)
                target_num = float(target_value)
                
                # Calculate distance from target
                if operator in ["gt", "gte"]:
                    # Higher is better
                    if stock_num >= target_num:
                        excess = (stock_num - target_num) / max(target_num, 1)
                        # Score decreases for values way above target
                        return min(100.0, 100.0 - (excess * 10))
                    else:
                        # Penalize values below threshold
                        shortfall = (target_num - stock_num) / max(target_num, 1)
                        return max(0.0, 50.0 - (shortfall * 100))
                
                else:  # lt, lte
                    # Lower is better
                    if stock_num <= target_num:
                        below = (target_num - stock_num) / max(target_num, 1)
                        return min(100.0, 100.0 - (below * 10))
                    else:
                        excess = (stock_num - target_num) / max(target_num, 1)
                        return max(0.0, 50.0 - (excess * 100))
            
            # For contains/search
            if operator == "contains":
                if target_value.lower() in str(stock_value).lower():
                    return 100.0
                return 0.0
            
            return 50.0  # Default neutral score
            
        except (ValueError, TypeError):
            return 50.0
    
    def _get_filter_hash(self, filters: List[Dict], sort_by: str, sort_order: str) -> str:
        """Generate hash for filter combination"""
        filter_string = json.dumps({
            "filters": sorted(filters, key=lambda x: x.get('field', '')),
            "sort_by": sort_by,
            "sort_order": sort_order
        }, sort_keys=True)
        return hashlib.md5(filter_string.encode()).hexdigest()
    
    def _get_cached_results(
        self,
        filters: List[Dict],
        sort_by: str,
        sort_order: str
    ) -> Optional[Dict]:
        """Retrieve cached screening results if available"""
        filter_hash = self._get_filter_hash(filters, sort_by, sort_order)
        
        try:
            result = self.db.table('screening_cache')\
                .select('*')\
                .eq('filter_hash', filter_hash)\
                .gt('expires_at', datetime.utcnow().isoformat())\
                .single()\
                .execute()
            
            if result.data:
                cached_data = result.data['results']
                cached_data['cached'] = True
                return cached_data
        except:
            pass
        
        return None
    
    def _cache_results(
        self,
        filters: List[Dict],
        sort_by: str,
        sort_order: str,
        results: Dict
    ):
        """Cache screening results"""
        filter_hash = self._get_filter_hash(filters, sort_by, sort_order)
        expires_at = datetime.utcnow() + timedelta(minutes=self.cache_duration_minutes)
        
        try:
            self.db.table('screening_cache').upsert({
                'filter_hash': filter_hash,
                'results': results,
                'result_count': results.get('total_count', 0),
                'expires_at': expires_at.isoformat()
            }).execute()
        except Exception as e:
            print(f"Cache error: {e}")
    
    def get_screening_presets(self) -> List[Dict]:
        """
        Get predefined screening presets
        
        Returns:
            List of preset screen configurations
        """
        return [
            {
                "id": "value_stocks",
                "name": "Value Stocks",
                "description": "Undervalued companies with low P/E and high dividend yield",
                "filters": [
                    {"field": "pe_ratio", "operator": "lt", "value": 20},
                    {"field": "dividend_yield", "operator": "gt", "value": 2.0},
                    {"field": "debt_to_equity", "operator": "lt", "value": 1.0}
                ]
            },
            {
                "id": "growth_stocks",
                "name": "Growth Stocks",
                "description": "High growth companies with strong revenue expansion",
                "filters": [
                    {"field": "revenue_growth", "operator": "gt", "value": 15},
                    {"field": "profit_margin", "operator": "gt", "value": 15},
                    {"field": "market_cap", "operator": "gt", "value": 1000000000}
                ]
            },
            {
                "id": "dividend_aristocrats",
                "name": "Dividend Aristocrats",
                "description": "Reliable dividend payers with strong yields",
                "filters": [
                    {"field": "dividend_yield", "operator": "gt", "value": 3.0},
                    {"field": "roe", "operator": "gt", "value": 15},
                    {"field": "debt_to_equity", "operator": "lt", "value": 0.8}
                ]
            },
            {
                "id": "quality_stocks",
                "name": "Quality Stocks",
                "description": "High quality companies with strong fundamentals",
                "filters": [
                    {"field": "roe", "operator": "gt", "value": 15},
                    {"field": "profit_margin", "operator": "gt", "value": 15},
                    {"field": "current_ratio", "operator": "gt", "value": 1.5},
                    {"field": "debt_to_equity", "operator": "lt", "value": 0.5}
                ]
            },
            {
                "id": "momentum_stocks",
                "name": "Momentum Stocks",
                "description": "Stocks with strong recent performance",
                "filters": [
                    {"field": "change_percent", "operator": "gt", "value": 5},
                    {"field": "volume", "operator": "gt", "value": 1000000}
                ]
            },
            {
                "id": "tech_leaders",
                "name": "Technology Leaders",
                "description": "Top performing technology companies",
                "filters": [
                    {"field": "sector", "operator": "eq", "value": "Technology"},
                    {"field": "market_cap", "operator": "gt", "value": 10000000000},
                    {"field": "revenue_growth", "operator": "gt", "value": 10}
                ]
            }
        ]


def get_stock_screener(db: Client) -> StockScreener:
    """Get stock screener instance"""
    return StockScreener(db)
