"""
Portfolio Analytics Service
Calculate portfolio metrics, sector allocation, diversification, and performance
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import asyncio


class PortfolioAnalytics:
    """Portfolio analytics calculator"""
    
    def __init__(self, holdings: List[Dict], prices: Dict):
        """
        Initialize with portfolio holdings and current prices
        
        Args:
            holdings: List of portfolio holdings
            prices: Dict of current prices by ticker
        """
        self.holdings = holdings
        self.prices = prices
    
    def calculate_total_value(self) -> float:
        """Calculate total portfolio value"""
        total = 0
        for holding in self.holdings:
            ticker = holding["ticker"]
            quantity = float(holding["quantity"])
            price = self.prices.get(ticker, {}).get("price", 0)
            total += quantity * price
        return total
    
    def calculate_total_cost(self) -> float:
        """Calculate total cost basis"""
        return sum(float(h["total_cost"]) for h in self.holdings)
    
    def calculate_gains_losses(self) -> Dict:
        """Calculate total gains/losses"""
        total_value = self.calculate_total_value()
        total_cost = self.calculate_total_cost()
        gain_loss = total_value - total_cost
        gain_loss_pct = (gain_loss / total_cost * 100) if total_cost > 0 else 0
        
        return {
            "total_value": round(total_value, 2),
            "total_cost": round(total_cost, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2)
        }
    
    def calculate_sector_allocation(self) -> List[Dict]:
        """
        Calculate sector allocation (requires sector data in holdings)
        
        Returns:
            List of sectors with values and percentages
        """
        total_value = self.calculate_total_value()
        if total_value == 0:
            return []
        
        sectors = {}
        
        for holding in self.holdings:
            ticker = holding["ticker"]
            sector = holding.get("sector", "Unknown")
            quantity = float(holding["quantity"])
            price = self.prices.get(ticker, {}).get("price", 0)
            value = quantity * price
            
            if sector in sectors:
                sectors[sector] += value
            else:
                sectors[sector] = value
        
        # Convert to list with percentages
        sector_list = []
        for sector, value in sectors.items():
            pct = (value / total_value * 100) if total_value > 0 else 0
            sector_list.append({
                "sector": sector,
                "value": round(value, 2),
                "percentage": round(pct, 2)
            })
        
        # Sort by value descending
        sector_list.sort(key=lambda x: x["value"], reverse=True)
        
        return sector_list
    
    def calculate_position_sizes(self) -> List[Dict]:
        """
        Calculate position size for each holding
        
        Returns:
            List of holdings with position sizes
        """
        total_value = self.calculate_total_value()
        if total_value == 0:
            return []
        
        positions = []
        
        for holding in self.holdings:
            ticker = holding["ticker"]
            quantity = float(holding["quantity"])
            price = self.prices.get(ticker, {}).get("price", 0)
            value = quantity * price
            pct = (value / total_value * 100) if total_value > 0 else 0
            
            positions.append({
                "ticker": ticker,
                "value": round(value, 2),
                "percentage": round(pct, 2)
            })
        
        # Sort by value descending
        positions.sort(key=lambda x: x["value"], reverse=True)
        
        return positions
    
    def find_best_performer(self) -> Optional[Dict]:
        """Find best performing holding"""
        best = None
        best_pct = float('-inf')
        
        for holding in self.holdings:
            ticker = holding["ticker"]
            quantity = float(holding["quantity"])
            cost = float(holding["total_cost"])
            price = self.prices.get(ticker, {}).get("price", 0)
            value = quantity * price
            
            if cost > 0:
                gain_loss_pct = ((value - cost) / cost) * 100
                
                if gain_loss_pct > best_pct:
                    best_pct = gain_loss_pct
                    best = {
                        "ticker": ticker,
                        "gain_loss_pct": round(gain_loss_pct, 2),
                        "gain_loss": round(value - cost, 2),
                        "value": round(value, 2)
                    }
        
        return best
    
    def find_worst_performer(self) -> Optional[Dict]:
        """Find worst performing holding"""
        worst = None
        worst_pct = float('inf')
        
        for holding in self.holdings:
            ticker = holding["ticker"]
            quantity = float(holding["quantity"])
            cost = float(holding["total_cost"])
            price = self.prices.get(ticker, {}).get("price", 0)
            value = quantity * price
            
            if cost > 0:
                gain_loss_pct = ((value - cost) / cost) * 100
                
                if gain_loss_pct < worst_pct:
                    worst_pct = gain_loss_pct
                    worst = {
                        "ticker": ticker,
                        "gain_loss_pct": round(gain_loss_pct, 2),
                        "gain_loss": round(value - cost, 2),
                        "value": round(value, 2)
                    }
        
        return worst
    
    def calculate_diversification_score(self) -> Dict:
        """
        Calculate diversification metrics
        
        Returns:
            Dict with diversification score and metrics
        """
        if not self.holdings:
            return {
                "score": 0,
                "num_holdings": 0,
                "concentration_risk": "High",
                "largest_position_pct": 0
            }
        
        positions = self.calculate_position_sizes()
        num_holdings = len(positions)
        
        # Calculate concentration (largest position)
        largest_pct = positions[0]["percentage"] if positions else 0
        
        # Simple diversification score (0-100)
        # Based on number of holdings and concentration
        if num_holdings == 1:
            score = 20
        elif num_holdings <= 3:
            score = 40
        elif num_holdings <= 5:
            score = 60
        elif num_holdings <= 10:
            score = 75
        else:
            score = 85
        
        # Penalize concentration
        if largest_pct > 50:
            score -= 20
        elif largest_pct > 30:
            score -= 10
        elif largest_pct > 20:
            score -= 5
        
        score = max(0, min(100, score))
        
        # Determine concentration risk
        if largest_pct > 40:
            risk = "High"
        elif largest_pct > 25:
            risk = "Medium"
        else:
            risk = "Low"
        
        return {
            "score": round(score, 0),
            "num_holdings": num_holdings,
            "concentration_risk": risk,
            "largest_position_pct": round(largest_pct, 2)
        }
    
    def calculate_holding_performance(self, holding: Dict) -> Dict:
        """Calculate performance for a single holding"""
        ticker = holding["ticker"]
        quantity = float(holding["quantity"])
        cost = float(holding["total_cost"])
        avg_cost = float(holding["avg_cost_basis"])
        
        price = self.prices.get(ticker, {}).get("price", 0)
        value = quantity * price
        gain_loss = value - cost
        gain_loss_pct = (gain_loss / cost * 100) if cost > 0 else 0
        
        return {
            "ticker": ticker,
            "quantity": quantity,
            "avg_cost_basis": avg_cost,
            "total_cost": cost,
            "current_price": price,
            "current_value": round(value, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2)
        }
    
    def calculate_all_metrics(self) -> Dict:
        """Calculate all portfolio metrics at once"""
        gains_losses = self.calculate_gains_losses()
        sector_allocation = self.calculate_sector_allocation()
        position_sizes = self.calculate_position_sizes()
        best_performer = self.find_best_performer()
        worst_performer = self.find_worst_performer()
        diversification = self.calculate_diversification_score()
        
        return {
            "summary": gains_losses,
            "sector_allocation": sector_allocation,
            "position_sizes": position_sizes,
            "best_performer": best_performer,
            "worst_performer": worst_performer,
            "diversification": diversification,
            "num_holdings": len(self.holdings)
        }


# Helper functions for portfolio analytics

async def calculate_portfolio_metrics(holdings: List[Dict], prices: Dict) -> Dict:
    """
    Calculate comprehensive portfolio metrics
    
    Args:
        holdings: List of portfolio holdings
        prices: Dict of current prices
        
    Returns:
        Dict with all portfolio metrics
    """
    analytics = PortfolioAnalytics(holdings, prices)
    return analytics.calculate_all_metrics()


def calculate_performance_over_time(snapshots: List[Dict]) -> Dict:
    """
    Calculate performance metrics from historical snapshots
    
    Args:
        snapshots: List of historical portfolio snapshots
        
    Returns:
        Dict with time-based performance metrics
    """
    if not snapshots:
        return {
            "period": "all_time",
            "total_return": 0,
            "total_return_pct": 0,
            "start_value": 0,
            "end_value": 0
        }
    
    # Sort by date
    sorted_snapshots = sorted(snapshots, key=lambda x: x["snapshot_date"])
    
    first = sorted_snapshots[0]
    last = sorted_snapshots[-1]
    
    start_value = float(first["total_value"])
    end_value = float(last["total_value"])
    start_cost = float(first["total_cost"])
    
    total_return = end_value - start_cost
    total_return_pct = (total_return / start_cost * 100) if start_cost > 0 else 0
    
    # Calculate annualized return
    start_date = datetime.strptime(first["snapshot_date"], "%Y-%m-%d")
    end_date = datetime.strptime(last["snapshot_date"], "%Y-%m-%d")
    days = (end_date - start_date).days
    years = days / 365.25
    
    if years > 0 and start_cost > 0:
        annualized_return = ((end_value / start_cost) ** (1 / years) - 1) * 100
    else:
        annualized_return = total_return_pct
    
    return {
        "period": "all_time",
        "total_return": round(total_return, 2),
        "total_return_pct": round(total_return_pct, 2),
        "annualized_return_pct": round(annualized_return, 2),
        "start_value": round(start_value, 2),
        "end_value": round(end_value, 2),
        "days": days
    }


def calculate_realized_gains(transactions: List[Dict]) -> Dict:
    """
    Calculate realized gains/losses from sell transactions
    
    Args:
        transactions: List of portfolio transactions
        
    Returns:
        Dict with realized gains/losses
    """
    realized_gains = 0
    sell_count = 0
    
    # Group transactions by ticker
    ticker_transactions = {}
    for txn in transactions:
        ticker = txn["ticker"]
        if ticker not in ticker_transactions:
            ticker_transactions[ticker] = []
        ticker_transactions[ticker].append(txn)
    
    # Calculate realized gains for each ticker
    for ticker, txns in ticker_transactions.items():
        # Sort by date
        sorted_txns = sorted(txns, key=lambda x: x["transaction_date"])
        
        # FIFO cost basis
        buys = []
        for txn in sorted_txns:
            if txn["transaction_type"] == "BUY":
                buys.append({
                    "quantity": float(txn["quantity"]),
                    "price": float(txn["price_per_share"])
                })
            elif txn["transaction_type"] == "SELL":
                sell_quantity = float(txn["quantity"])
                sell_price = float(txn["price_per_share"])
                sell_count += 1
                
                # Calculate gain using FIFO
                remaining = sell_quantity
                while remaining > 0 and buys:
                    buy = buys[0]
                    if buy["quantity"] <= remaining:
                        # Use entire buy lot
                        realized_gains += (sell_price - buy["price"]) * buy["quantity"]
                        remaining -= buy["quantity"]
                        buys.pop(0)
                    else:
                        # Partial buy lot
                        realized_gains += (sell_price - buy["price"]) * remaining
                        buy["quantity"] -= remaining
                        remaining = 0
    
    return {
        "realized_gains": round(realized_gains, 2),
        "sell_transactions": sell_count
    }
