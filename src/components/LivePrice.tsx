"""
Live Price Display Component
Shows real-time price updates with WebSocket
"""
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMarketData } from '@/hooks/use-market-data';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LivePriceProps {
  ticker: string;
  showChange?: boolean;
  className?: string;
}

export function LivePrice({ ticker, showChange = true, className = '' }: LivePriceProps) {
  const { isConnected, subscribe, unsubscribe, getPrice } = useMarketData();
  
  useEffect(() => {
    if (isConnected) {
      subscribe([ticker]);
    }
    
    return () => {
      unsubscribe([ticker]);
    };
  }, [ticker, isConnected, subscribe, unsubscribe]);
  
  const priceData = getPrice(ticker);
  
  if (!priceData) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Loading price...
      </div>
    );
  }
  
  const isPositive = priceData.change_percent >= 0;
  const isNeutral = priceData.change_percent === 0;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-lg font-semibold">
        ${priceData.price.toFixed(2)}
      </span>
      
      {showChange && (
        <Badge
          variant={isNeutral ? 'secondary' : isPositive ? 'default' : 'destructive'}
          className="flex items-center gap-1"
        >
          {isNeutral ? (
            <Minus className="h-3 w-3" />
          ) : isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>
            {isPositive ? '+' : ''}{priceData.change.toFixed(2)} ({isPositive ? '+' : ''}{priceData.change_percent.toFixed(2)}%)
          </span>
        </Badge>
      )}
      
      {!isConnected && (
        <span className="text-xs text-muted-foreground">(offline)</span>
      )}
    </div>
  );
}


interface WatchlistLivePricesProps {
  tickers: string[];
}

export function WatchlistLivePrices({ tickers }: WatchlistLivePricesProps) {
  const { isConnected, subscribe, unsubscribe, prices } = useMarketData();
  
  useEffect(() => {
    if (isConnected && tickers.length > 0) {
      subscribe(tickers);
    }
    
    return () => {
      if (tickers.length > 0) {
        unsubscribe(tickers);
      }
    };
  }, [tickers, isConnected, subscribe, unsubscribe]);
  
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Prices</h3>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {tickers.map((ticker) => {
          const priceData = prices.get(ticker.toUpperCase());
          
          return (
            <div key={ticker} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div>
                <div className="font-medium">{ticker}</div>
                {priceData && (
                  <div className="text-xs text-muted-foreground">
                    Vol: {(priceData.volume / 1000000).toFixed(2)}M
                  </div>
                )}
              </div>
              
              <div className="text-right">
                {priceData ? (
                  <>
                    <div className="text-lg font-semibold">
                      ${priceData.price.toFixed(2)}
                    </div>
                    <div className={`text-sm ${priceData.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {priceData.change_percent >= 0 ? '+' : ''}{priceData.change.toFixed(2)} ({priceData.change_percent >= 0 ? '+' : ''}{priceData.change_percent.toFixed(2)}%)
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                )}
              </div>
            </div>
          );
        })}
        
        {tickers.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No stocks in watchlist
          </div>
        )}
      </div>
    </Card>
  );
}
