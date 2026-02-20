"""
Technical Indicators Calculator
Computes popular technical analysis indicators from price data
"""
from typing import Dict, List, Optional, Tuple
import numpy as np
from datetime import datetime, timedelta


class TechnicalIndicators:
    """
    Calculate technical analysis indicators
    Supports: SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, ADX
    """
    
    @staticmethod
    def sma(prices: List[float], period: int = 20) -> List[Optional[float]]:
        """
        Simple Moving Average
        
        Args:
            prices: List of closing prices
            period: Number of periods (default: 20)
            
        Returns:
            List of SMA values (None for periods without enough data)
        """
        if len(prices) < period:
            return [None] * len(prices)
        
        result = [None] * (period - 1)
        
        for i in range(period - 1, len(prices)):
            window = prices[i - period + 1:i + 1]
            result.append(sum(window) / period)
        
        return result
    
    @staticmethod
    def ema(prices: List[float], period: int = 20) -> List[Optional[float]]:
        """
        Exponential Moving Average
        
        Args:
            prices: List of closing prices
            period: Number of periods (default: 20)
            
        Returns:
            List of EMA values
        """
        if len(prices) < period:
            return [None] * len(prices)
        
        multiplier = 2 / (period + 1)
        result = [None] * (period - 1)
        
        # First EMA is SMA
        sma_first = sum(prices[:period]) / period
        result.append(sma_first)
        
        # Calculate subsequent EMAs
        ema_prev = sma_first
        for i in range(period, len(prices)):
            ema_current = (prices[i] - ema_prev) * multiplier + ema_prev
            result.append(ema_current)
            ema_prev = ema_current
        
        return result
    
    @staticmethod
    def rsi(prices: List[float], period: int = 14) -> List[Optional[float]]:
        """
        Relative Strength Index (0-100)
        
        Args:
            prices: List of closing prices
            period: Number of periods (default: 14)
            
        Returns:
            List of RSI values (0-100)
        """
        if len(prices) < period + 1:
            return [None] * len(prices)
        
        # Calculate price changes
        changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        
        result = [None] * period
        
        # Calculate gains and losses
        gains = [max(change, 0) for change in changes]
        losses = [abs(min(change, 0)) for change in changes]
        
        # First RSI uses simple average
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        if avg_loss == 0:
            result.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi_val = 100 - (100 / (1 + rs))
            result.append(rsi_val)
        
        # Subsequent RSI uses smoothed average
        for i in range(period, len(changes)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            
            if avg_loss == 0:
                result.append(100.0)
            else:
                rs = avg_gain / avg_loss
                rsi_val = 100 - (100 / (1 + rs))
                result.append(rsi_val)
        
        return result
    
    @staticmethod
    def macd(
        prices: List[float],
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9
    ) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
        """
        Moving Average Convergence Divergence
        
        Args:
            prices: List of closing prices
            fast_period: Fast EMA period (default: 12)
            slow_period: Slow EMA period (default: 26)
            signal_period: Signal line EMA period (default: 9)
            
        Returns:
            Tuple of (MACD line, Signal line, Histogram)
        """
        if len(prices) < slow_period:
            none_list = [None] * len(prices)
            return none_list, none_list, none_list
        
        # Calculate EMAs
        ema_fast = TechnicalIndicators.ema(prices, fast_period)
        ema_slow = TechnicalIndicators.ema(prices, slow_period)
        
        # MACD line = Fast EMA - Slow EMA
        macd_line = []
        for i in range(len(prices)):
            if ema_fast[i] is not None and ema_slow[i] is not None:
                macd_line.append(ema_fast[i] - ema_slow[i])
            else:
                macd_line.append(None)
        
        # Signal line = EMA of MACD line
        macd_values = [v for v in macd_line if v is not None]
        if len(macd_values) < signal_period:
            signal_line = [None] * len(prices)
            histogram = [None] * len(prices)
            return macd_line, signal_line, histogram
        
        signal_line = [None] * len(prices)
        start_idx = next(i for i, v in enumerate(macd_line) if v is not None)
        
        signal_ema = TechnicalIndicators.ema(macd_values, signal_period)
        
        for i, sig_val in enumerate(signal_ema):
            if sig_val is not None:
                signal_line[start_idx + i] = sig_val
        
        # Histogram = MACD - Signal
        histogram = []
        for i in range(len(prices)):
            if macd_line[i] is not None and signal_line[i] is not None:
                histogram.append(macd_line[i] - signal_line[i])
            else:
                histogram.append(None)
        
        return macd_line, signal_line, histogram
    
    @staticmethod
    def bollinger_bands(
        prices: List[float],
        period: int = 20,
        std_dev: float = 2.0
    ) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
        """
        Bollinger Bands
        
        Args:
            prices: List of closing prices
            period: Number of periods (default: 20)
            std_dev: Number of standard deviations (default: 2.0)
            
        Returns:
            Tuple of (Upper band, Middle band/SMA, Lower band)
        """
        if len(prices) < period:
            none_list = [None] * len(prices)
            return none_list, none_list, none_list
        
        middle_band = TechnicalIndicators.sma(prices, period)
        upper_band = [None] * (period - 1)
        lower_band = [None] * (period - 1)
        
        for i in range(period - 1, len(prices)):
            window = prices[i - period + 1:i + 1]
            std = np.std(window)
            
            upper_band.append(middle_band[i] + (std_dev * std))
            lower_band.append(middle_band[i] - (std_dev * std))
        
        return upper_band, middle_band, lower_band
    
    @staticmethod
    def stochastic(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        period: int = 14,
        smooth_k: int = 3,
        smooth_d: int = 3
    ) -> Tuple[List[Optional[float]], List[Optional[float]]]:
        """
        Stochastic Oscillator (%K and %D)
        
        Args:
            highs: List of high prices
            lows: List of low prices
            closes: List of closing prices
            period: Lookback period (default: 14)
            smooth_k: %K smoothing (default: 3)
            smooth_d: %D smoothing (default: 3)
            
        Returns:
            Tuple of (%K line, %D line)
        """
        if len(closes) < period:
            none_list = [None] * len(closes)
            return none_list, none_list
        
        # Calculate raw %K
        raw_k = [None] * (period - 1)
        
        for i in range(period - 1, len(closes)):
            window_high = max(highs[i - period + 1:i + 1])
            window_low = min(lows[i - period + 1:i + 1])
            
            if window_high == window_low:
                raw_k.append(50.0)
            else:
                k = ((closes[i] - window_low) / (window_high - window_low)) * 100
                raw_k.append(k)
        
        # Smooth %K
        k_values = [v for v in raw_k if v is not None]
        if len(k_values) < smooth_k:
            none_list = [None] * len(closes)
            return none_list, none_list
        
        k_line = [None] * len(raw_k)
        start_idx = next(i for i, v in enumerate(raw_k) if v is not None)
        
        smoothed_k = TechnicalIndicators.sma(k_values, smooth_k)
        for i, k_val in enumerate(smoothed_k):
            if k_val is not None:
                k_line[start_idx + i] = k_val
        
        # Calculate %D (SMA of %K)
        k_values_clean = [v for v in k_line if v is not None]
        if len(k_values_clean) < smooth_d:
            return k_line, [None] * len(closes)
        
        d_line = [None] * len(closes)
        start_idx_d = next(i for i, v in enumerate(k_line) if v is not None)
        
        smoothed_d = TechnicalIndicators.sma(k_values_clean, smooth_d)
        for i, d_val in enumerate(smoothed_d):
            if d_val is not None:
                d_line[start_idx_d + i] = d_val
        
        return k_line, d_line
    
    @staticmethod
    def atr(
        highs: List[float],
        lows: List[float],
        closes: List[float],
        period: int = 14
    ) -> List[Optional[float]]:
        """
        Average True Range (volatility indicator)
        
        Args:
            highs: List of high prices
            lows: List of low prices
            closes: List of closing prices
            period: Number of periods (default: 14)
            
        Returns:
            List of ATR values
        """
        if len(closes) < period + 1:
            return [None] * len(closes)
        
        # Calculate True Range
        true_ranges = [None]  # First value is None
        
        for i in range(1, len(closes)):
            high_low = highs[i] - lows[i]
            high_close = abs(highs[i] - closes[i-1])
            low_close = abs(lows[i] - closes[i-1])
            
            tr = max(high_low, high_close, low_close)
            true_ranges.append(tr)
        
        # Calculate ATR (smoothed average of TR)
        result = [None] * period
        
        # First ATR is simple average
        tr_values = [v for v in true_ranges if v is not None]
        atr_val = sum(tr_values[:period]) / period
        result.append(atr_val)
        
        # Subsequent ATR uses Wilder's smoothing
        for i in range(period + 1, len(closes)):
            atr_val = (atr_val * (period - 1) + true_ranges[i]) / period
            result.append(atr_val)
        
        return result
    
    @staticmethod
    def obv(closes: List[float], volumes: List[int]) -> List[int]:
        """
        On-Balance Volume
        
        Args:
            closes: List of closing prices
            volumes: List of volumes
            
        Returns:
            List of OBV values
        """
        if len(closes) != len(volumes) or len(closes) < 2:
            return [0] * len(closes)
        
        obv_vals = [0]  # First value is 0
        
        for i in range(1, len(closes)):
            if closes[i] > closes[i-1]:
                obv_vals.append(obv_vals[-1] + volumes[i])
            elif closes[i] < closes[i-1]:
                obv_vals.append(obv_vals[-1] - volumes[i])
            else:
                obv_vals.append(obv_vals[-1])
        
        return obv_vals
    
    @staticmethod
    def calculate_all(price_data: List[Dict]) -> Dict:
        """
        Calculate all technical indicators for price data
        
        Args:
            price_data: List of dicts with keys: date, open, high, low, close, volume
            
        Returns:
            Dict with all calculated indicators
        """
        if not price_data or len(price_data) < 50:
            return {}
        
        # Extract price arrays
        closes = [float(d['close']) for d in price_data]
        highs = [float(d['high']) for d in price_data]
        lows = [float(d['low']) for d in price_data]
        volumes = [int(d['volume']) for d in price_data]
        
        # Calculate all indicators
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)
        sma_200 = TechnicalIndicators.sma(closes, 200)
        
        ema_12 = TechnicalIndicators.ema(closes, 12)
        ema_26 = TechnicalIndicators.ema(closes, 26)
        
        rsi = TechnicalIndicators.rsi(closes, 14)
        
        macd_line, signal_line, histogram = TechnicalIndicators.macd(closes)
        
        bb_upper, bb_middle, bb_lower = TechnicalIndicators.bollinger_bands(closes)
        
        stoch_k, stoch_d = TechnicalIndicators.stochastic(highs, lows, closes)
        
        atr = TechnicalIndicators.atr(highs, lows, closes)
        
        obv = TechnicalIndicators.obv(closes, volumes)
        
        # Get latest values
        return {
            "sma_20": sma_20[-1] if sma_20 and sma_20[-1] is not None else None,
            "sma_50": sma_50[-1] if sma_50 and sma_50[-1] is not None else None,
            "sma_200": sma_200[-1] if sma_200 and sma_200[-1] is not None else None,
            "ema_12": ema_12[-1] if ema_12 and ema_12[-1] is not None else None,
            "ema_26": ema_26[-1] if ema_26 and ema_26[-1] is not None else None,
            "rsi": rsi[-1] if rsi and rsi[-1] is not None else None,
            "macd": macd_line[-1] if macd_line and macd_line[-1] is not None else None,
            "macd_signal": signal_line[-1] if signal_line and signal_line[-1] is not None else None,
            "macd_histogram": histogram[-1] if histogram and histogram[-1] is not None else None,
            "bb_upper": bb_upper[-1] if bb_upper and bb_upper[-1] is not None else None,
            "bb_middle": bb_middle[-1] if bb_middle and bb_middle[-1] is not None else None,
            "bb_lower": bb_lower[-1] if bb_lower and bb_lower[-1] is not None else None,
            "stoch_k": stoch_k[-1] if stoch_k and stoch_k[-1] is not None else None,
            "stoch_d": stoch_d[-1] if stoch_d and stoch_d[-1] is not None else None,
            "atr": atr[-1] if atr and atr[-1] is not None else None,
            "obv": obv[-1] if obv else None,
            "current_price": closes[-1],
            "volume": volumes[-1]
        }


class SignalDetector:
    """
    Detect trading signals from technical indicators
    """
    
    @staticmethod
    def detect_signals(indicators: Dict, price_data: List[Dict]) -> Dict:
        """
        Detect buy/sell signals from technical indicators
        
        Args:
            indicators: Dict of calculated indicators
            price_data: Historical price data
            
        Returns:
            Dict with detected signals and strength (0-100)
        """
        signals = {
            "overall_signal": "NEUTRAL",
            "signal_strength": 50,
            "buy_signals": [],
            "sell_signals": [],
            "details": {}
        }
        
        if not indicators or not price_data:
            return signals
        
        buy_count = 0
        sell_count = 0
        
        # RSI Signals
        rsi = indicators.get('rsi')
        if rsi:
            if rsi < 30:
                signals["buy_signals"].append("RSI Oversold (<30)")
                buy_count += 2
            elif rsi < 40:
                signals["buy_signals"].append("RSI Low (<40)")
                buy_count += 1
            elif rsi > 70:
                signals["sell_signals"].append("RSI Overbought (>70)")
                sell_count += 2
            elif rsi > 60:
                signals["sell_signals"].append("RSI High (>60)")
                sell_count += 1
            
            signals["details"]["rsi_signal"] = "oversold" if rsi < 30 else "overbought" if rsi > 70 else "neutral"
        
        # MACD Signals
        macd = indicators.get('macd')
        macd_signal = indicators.get('macd_signal')
        macd_hist = indicators.get('macd_histogram')
        
        if macd and macd_signal and macd_hist:
            if macd > macd_signal and macd_hist > 0:
                signals["buy_signals"].append("MACD Bullish Crossover")
                buy_count += 2
            elif macd < macd_signal and macd_hist < 0:
                signals["sell_signals"].append("MACD Bearish Crossover")
                sell_count += 2
            
            signals["details"]["macd_signal"] = "bullish" if macd > macd_signal else "bearish"
        
        # Moving Average Signals
        current_price = indicators.get('current_price')
        sma_20 = indicators.get('sma_20')
        sma_50 = indicators.get('sma_50')
        sma_200 = indicators.get('sma_200')
        
        if current_price and sma_20 and sma_50:
            if current_price > sma_20 > sma_50:
                signals["buy_signals"].append("Price Above MA20 & MA50")
                buy_count += 1
            elif current_price < sma_20 < sma_50:
                signals["sell_signals"].append("Price Below MA20 & MA50")
                sell_count += 1
            
            # Golden Cross / Death Cross
            if sma_50 and sma_200:
                if sma_50 > sma_200:
                    signals["buy_signals"].append("Golden Cross (MA50 > MA200)")
                    buy_count += 2
                elif sma_50 < sma_200:
                    signals["sell_signals"].append("Death Cross (MA50 < MA200)")
                    sell_count += 2
        
        # Bollinger Bands Signals
        bb_upper = indicators.get('bb_upper')
        bb_lower = indicators.get('bb_lower')
        
        if current_price and bb_upper and bb_lower:
            if current_price <= bb_lower:
                signals["buy_signals"].append("Price At Lower Bollinger Band")
                buy_count += 1
            elif current_price >= bb_upper:
                signals["sell_signals"].append("Price At Upper Bollinger Band")
                sell_count += 1
        
        # Stochastic Signals
        stoch_k = indicators.get('stoch_k')
        stoch_d = indicators.get('stoch_d')
        
        if stoch_k and stoch_d:
            if stoch_k < 20 and stoch_d < 20:
                signals["buy_signals"].append("Stochastic Oversold (<20)")
                buy_count += 1
            elif stoch_k > 80 and stoch_d > 80:
                signals["sell_signals"].append("Stochastic Overbought (>80)")
                sell_count += 1
            
            if stoch_k > stoch_d:
                signals["details"]["stochastic_signal"] = "bullish"
            else:
                signals["details"]["stochastic_signal"] = "bearish"
        
        # Calculate overall signal
        total_signals = buy_count + sell_count
        
        if total_signals > 0:
            buy_percentage = (buy_count / total_signals) * 100
            
            if buy_percentage >= 70:
                signals["overall_signal"] = "STRONG BUY"
                signals["signal_strength"] = 80 + (buy_percentage - 70) * 0.67
            elif buy_percentage >= 55:
                signals["overall_signal"] = "BUY"
                signals["signal_strength"] = 60 + (buy_percentage - 55) * 1.33
            elif buy_percentage >= 45:
                signals["overall_signal"] = "NEUTRAL"
                signals["signal_strength"] = 45 + (buy_percentage - 45)
            elif buy_percentage >= 30:
                signals["overall_signal"] = "SELL"
                signals["signal_strength"] = 30 + (buy_percentage - 30)
            else:
                signals["overall_signal"] = "STRONG SELL"
                signals["signal_strength"] = max(10, buy_percentage)
        
        signals["signal_strength"] = round(signals["signal_strength"], 1)
        
        return signals
