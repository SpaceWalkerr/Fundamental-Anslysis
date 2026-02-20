"""
Real-Time Market Data Hook
Manages WebSocket connection for live price updates
"""
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface PriceUpdate {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  ticker?: string;
  data?: PriceUpdate;
  tickers?: string[];
  message?: string;
}

export function useMarketData() {
  const [isConnected, setIsConnected] = useState(false);
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedTickersRef = useRef<Set<string>>(new Set());
  
  const token = useAuthStore((state) => state.token);
  
  const connect = useCallback(() => {
    if (!token) return;
    
    const ws = new WebSocket(
      `ws://localhost:8000/api/ws/market-data?token=${token}`
    );
    
    ws.onopen = () => {
      console.log('✅ Market data WebSocket connected');
      setIsConnected(true);
      setError(null);
      
      // Resubscribe to tickers after reconnect
      if (subscribedTickersRef.current.size > 0) {
        const tickers = Array.from(subscribedTickersRef.current);
        ws.send(JSON.stringify({
          action: 'subscribe',
          tickers: tickers
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'price_update' && message.ticker && message.data) {
          setPrices((prev) => {
            const newPrices = new Map(prev);
            newPrices.set(message.ticker!, message.data!);
            return newPrices;
          });
        } else if (message.type === 'error') {
          console.error('WebSocket error:', message.message);
          setError(message.message || 'Unknown error');
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
    
    ws.onerror = (event) => {
      console.error('❌ WebSocket error:', event);
      setError('Connection error');
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;
      
      // Attempt reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        connect();
      }, 5000);
    };
    
    wsRef.current = ws;
  }, [token]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  const subscribe = useCallback((tickers: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queueing subscription');
      tickers.forEach(t => subscribedTickersRef.current.add(t.toUpperCase()));
      return;
    }
    
    const upperTickers = tickers.map(t => t.toUpperCase());
    upperTickers.forEach(t => subscribedTickersRef.current.add(t));
    
    wsRef.current.send(JSON.stringify({
      action: 'subscribe',
      tickers: upperTickers
    }));
  }, []);
  
  const unsubscribe = useCallback((tickers: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const upperTickers = tickers.map(t => t.toUpperCase());
    upperTickers.forEach(t => subscribedTickersRef.current.delete(t));
    
    wsRef.current.send(JSON.stringify({
      action: 'unsubscribe',
      tickers: upperTickers
    }));
  }, []);
  
  const getPrice = useCallback((ticker: string): PriceUpdate | undefined => {
    return prices.get(ticker.toUpperCase());
  }, [prices]);
  
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    isConnected,
    prices,
    error,
    subscribe,
    unsubscribe,
    getPrice,
    reconnect: connect
  };
}
