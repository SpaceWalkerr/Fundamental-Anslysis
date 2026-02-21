"""
Watchlist Analytics Service
Calculate performance metrics and insights for watchlists
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal


class WatchlistAnalytics:
    """
    Calculate watchlist metrics, performance, and insights
    """
    
    @staticmethod
    def calculate_summary(
        items: List[Dict[str, Any]],
        current_prices: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate summary metrics for a watchlist
        
        Args:
            items: List of watchlist items with ticker, added_price, target_price
            current_prices: Dict mapping tickers to current price data
            
        Returns:
            Dict with summary metrics
        """
        total_items = len(items)
        
        if total_items == 0:
            return {
                "total_items": 0,
                "tracked_value": 0.0,
                "avg_change_pct": 0.0,
                "best_performer": None,
                "worst_performer": None,
                "targets_hit": 0,
                "targets_near": 0,
                "total_target_distance": 0.0,
            }
        
        total_change_pct = 0.0
        tracked_value = 0.0
        
        performers = []
        targets_hit = 0
        targets_near = 0  # Within 5% of target
        total_target_distance = 0.0
        
        for item in items:
            ticker = item["ticker"]
            added_price = float(item.get("added_price", 0))
            target_price = float(item.get("target_price", 0)) if item.get("target_price") else None
            
            if ticker in current_prices and added_price > 0:
                current_price = current_prices[ticker].get("price", 0)
                
                if current_price > 0:
                    # Calculate change since added
                    change_pct = ((current_price - added_price) / added_price) * 100
                    total_change_pct += change_pct
                    tracked_value += current_price
                    
                    # Track best/worst performers
                    performers.append({
                        "ticker": ticker,
                        "change_pct": change_pct,
                        "current_price": current_price,
                    })
                    
                    # Check if target hit or near
                    if target_price:
                        target_type = item.get("target_price_type", "ALERT")
                        
                        # Calculate distance to target
                        distance_pct = abs((target_price - current_price) / current_price) * 100
                        total_target_distance += distance_pct
                        
                        if target_type == "BUY":
                            # For BUY targets, hit when current <= target
                            if current_price <= target_price:
                                targets_hit += 1
                            elif distance_pct <= 5:
                                targets_near += 1
                        elif target_type == "SELL":
                            # For SELL targets, hit when current >= target
                            if current_price >= target_price:
                                targets_hit += 1
                            elif distance_pct <= 5:
                                targets_near += 1
                        else:  # ALERT
                            # For alerts, hit when price reached exactly
                            if distance_pct <= 1:
                                targets_hit += 1
                            elif distance_pct <= 5:
                                targets_near += 1
        
        # Calculate averages
        avg_change_pct = total_change_pct / total_items if total_items > 0 else 0.0
        avg_target_distance = total_target_distance / total_items if total_items > 0 else 0.0
        
        # Sort performers
        performers_sorted = sorted(performers, key=lambda x: x["change_pct"], reverse=True)
        best_performer = performers_sorted[0] if performers_sorted else None
        worst_performer = performers_sorted[-1] if performers_sorted else None
        
        return {
            "total_items": total_items,
            "tracked_value": round(tracked_value, 2),
            "avg_change_pct": round(avg_change_pct, 2),
            "best_performer": best_performer,
            "worst_performer": worst_performer,
            "targets_hit": targets_hit,
            "targets_near": targets_near,
            "avg_target_distance": round(avg_target_distance, 2),
        }
    
    @staticmethod
    def get_target_alerts(
        items: List[Dict[str, Any]],
        current_prices: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Get stocks that have hit or are near their target prices
        
        Args:
            items: List of watchlist items
            current_prices: Dict mapping tickers to current price data
            
        Returns:
            List of items with target information
        """
        alerts = []
        
        for item in items:
            ticker = item["ticker"]
            target_price = float(item.get("target_price", 0)) if item.get("target_price") else None
            
            if not target_price or ticker not in current_prices:
                continue
            
            current_price = current_prices[ticker].get("price", 0)
            if current_price <= 0:
                continue
            
            target_type = item.get("target_price_type", "ALERT")
            distance = target_price - current_price
            distance_pct = (distance / current_price) * 100
            
            status = "watching"
            
            if target_type == "BUY":
                if current_price <= target_price:
                    status = "hit"
                elif abs(distance_pct) <= 5:
                    status = "near"
            elif target_type == "SELL":
                if current_price >= target_price:
                    status = "hit"
                elif abs(distance_pct) <= 5:
                    status = "near"
            else:  # ALERT
                if abs(distance_pct) <= 1:
                    status = "hit"
                elif abs(distance_pct) <= 5:
                    status = "near"
            
            if status in ["hit", "near"]:
                alerts.append({
                    "ticker": ticker,
                    "company_name": item.get("company_name"),
                    "current_price": current_price,
                    "target_price": target_price,
                    "target_type": target_type,
                    "distance": round(distance, 2),
                    "distance_pct": round(distance_pct, 2),
                    "status": status,
                    "notes": item.get("notes"),
                })
        
        # Sort by absolute distance percentage
        alerts.sort(key=lambda x: abs(x["distance_pct"]))
        
        return alerts
    
    @staticmethod
    def get_performance_by_tag(
        items: List[Dict[str, Any]],
        current_prices: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculate performance grouped by tags
        
        Args:
            items: List of watchlist items
            current_prices: Dict mapping tickers to current price data
            
        Returns:
            Dict mapping tags to performance metrics
        """
        tag_metrics: Dict[str, List[float]] = {}
        
        for item in items:
            ticker = item["ticker"]
            added_price = float(item.get("added_price", 0))
            tags = item.get("tags", [])
            
            if ticker in current_prices and added_price > 0:
                current_price = current_prices[ticker].get("price", 0)
                
                if current_price > 0:
                    change_pct = ((current_price - added_price) / added_price) * 100
                    
                    # Add to each tag group
                    for tag in tags:
                        if tag not in tag_metrics:
                            tag_metrics[tag] = []
                        tag_metrics[tag].append(change_pct)
        
        # Calculate averages for each tag
        result = {}
        for tag, changes in tag_metrics.items():
            result[tag] = {
                "count": len(changes),
                "avg_change_pct": round(sum(changes) / len(changes), 2),
                "best_change_pct": round(max(changes), 2),
                "worst_change_pct": round(min(changes), 2),
            }
        
        return result
    
    @staticmethod
    def get_top_movers(
        items: List[Dict[str, Any]],
        current_prices: Dict[str, Dict[str, Any]],
        limit: int = 5
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get top gainers and losers in the watchlist
        
        Args:
            items: List of watchlist items
            current_prices: Dict mapping tickers to current price data
            limit: Number of top movers to return
            
        Returns:
            Dict with 'gainers' and 'losers' lists
        """
        movers = []
        
        for item in items:
            ticker = item["ticker"]
            added_price = float(item.get("added_price", 0))
            
            if ticker in current_prices and added_price > 0:
                current_price = current_prices[ticker].get("price", 0)
                
                if current_price > 0:
                    change = current_price - added_price
                    change_pct = (change / added_price) * 100
                    
                    movers.append({
                        "ticker": ticker,
                        "company_name": item.get("company_name"),
                        "added_price": added_price,
                        "current_price": current_price,
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                    })
        
        # Sort by change percentage
        movers_sorted = sorted(movers, key=lambda x: x["change_pct"], reverse=True)
        
        return {
            "gainers": movers_sorted[:limit],
            "losers": movers_sorted[-limit:][::-1],  # Reverse to show worst first
        }
    
    @staticmethod
    def calculate_hypothetical_value(
        items: List[Dict[str, Any]],
        current_prices: Dict[str, Dict[str, Any]],
        investment_per_stock: float = 1000.0
    ) -> Dict[str, Any]:
        """
        Calculate hypothetical portfolio value if stocks were purchased
        
        Args:
            items: List of watchlist items
            current_prices: Dict mapping tickers to current price data
            investment_per_stock: Amount to hypothetically invest per stock
            
        Returns:
            Dict with hypothetical investment metrics
        """
        total_invested = 0.0
        total_current_value = 0.0
        stocks_analyzed = 0
        
        for item in items:
            ticker = item["ticker"]
            added_price = float(item.get("added_price", 0))
            
            if ticker in current_prices and added_price > 0:
                current_price = current_prices[ticker].get("price", 0)
                
                if current_price > 0:
                    # Calculate shares that would have been bought
                    shares = investment_per_stock / added_price
                    
                    # Calculate current value
                    current_value = shares * current_price
                    
                    total_invested += investment_per_stock
                    total_current_value += current_value
                    stocks_analyzed += 1
        
        gain_loss = total_current_value - total_invested
        gain_loss_pct = (gain_loss / total_invested * 100) if total_invested > 0 else 0.0
        
        return {
            "total_invested": round(total_invested, 2),
            "current_value": round(total_current_value, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2),
            "stocks_analyzed": stocks_analyzed,
            "investment_per_stock": investment_per_stock,
        }
    
    @staticmethod
    def get_sector_allocation(
        items: List[Dict[str, Any]],
        stock_info: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculate allocation by sector
        
        Args:
            items: List of watchlist items
            stock_info: Dict mapping tickers to stock information (including sector)
            
        Returns:
            Dict mapping sectors to counts and percentages
        """
        sector_counts: Dict[str, int] = {}
        total_stocks = len(items)
        
        for item in items:
            ticker = item["ticker"]
            
            if ticker in stock_info:
                sector = stock_info[ticker].get("sector", "Unknown")
                sector_counts[sector] = sector_counts.get(sector, 0) + 1
        
        # Calculate percentages
        result = {}
        for sector, count in sector_counts.items():
            result[sector] = {
                "count": count,
                "percentage": round((count / total_stocks * 100), 2) if total_stocks > 0 else 0.0,
            }
        
        return result
    
    @staticmethod
    def create_snapshot(
        watchlist_id: str,
        items: List[Dict[str, Any]],
        current_prices: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a snapshot of current watchlist performance
        
        Args:
            watchlist_id: Watchlist ID
            items: List of watchlist items
            current_prices: Dict mapping tickers to current price data
            
        Returns:
            Dict with snapshot data ready for database insertion
        """
        summary = WatchlistAnalytics.calculate_summary(items, current_prices)
        
        # Build detailed snapshot data
        snapshot_data = {}
        for item in items:
            ticker = item["ticker"]
            added_price = float(item.get("added_price", 0))
            
            if ticker in current_prices and added_price > 0:
                current_price = current_prices[ticker].get("price", 0)
                
                if current_price > 0:
                    change = current_price - added_price
                    change_pct = (change / added_price) * 100
                    
                    snapshot_data[ticker] = {
                        "added_price": added_price,
                        "current_price": current_price,
                        "change": round(change, 2),
                        "change_pct": round(change_pct, 2),
                        "target_price": float(item["target_price"]) if item.get("target_price") else None,
                        "target_type": item.get("target_price_type"),
                    }
        
        return {
            "watchlist_id": watchlist_id,
            "snapshot_date": datetime.now().date().isoformat(),
            "total_value": summary["tracked_value"],
            "avg_change_pct": summary["avg_change_pct"],
            "num_items": summary["total_items"],
            "snapshot_data": snapshot_data,
        }
