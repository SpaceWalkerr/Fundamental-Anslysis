"""
Technical Indicators Chart Component
Displays price charts with technical indicator overlays
"""
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { api } from '@/lib/api';

interface TechnicalIndicatorsProps {
  ticker: string;
}

interface Indicators {
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  bb_upper: number | null;
  bb_middle: number | null;
  bb_lower: number | null;
  current_price: number;
}

interface Signal {
  overall_signal: string;
  signal_strength: number;
  buy_signals: string[];
  sell_signals: string[];
}

export function TechnicalIndicators({ ticker }: TechnicalIndicatorsProps) {
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [signals, setSignals] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1y');

  useEffect(() => {
    fetchIndicators();
  }, [ticker, period]);

  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/stocks/${ticker}/technicals?period=${period}&include_signals=true`);
      setIndicators(response.data.indicators);
      setSignals(response.data.signals);
    } catch (error) {
      console.error('Error fetching indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (!indicators || !signals) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No technical data available</p>
      </Card>
    );
  }

  const getSignalColor = (signal: string) => {
    if (signal.includes('STRONG BUY')) return 'bg-green-600';
    if (signal.includes('BUY')) return 'bg-green-500';
    if (signal.includes('STRONG SELL')) return 'bg-red-600';
    if (signal.includes('SELL')) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getRSIColor = (rsi: number) => {
    if (rsi < 30) return 'text-green-600';
    if (rsi > 70) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      {/* Overall Signal */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trading Signal</h3>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6mo">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="2y">2 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Badge className={`${getSignalColor(signals.overall_signal)} text-white text-lg px-4 py-2`}>
            {signals.overall_signal}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Strength:</span>
            <div className="flex items-center gap-1">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${signals.signal_strength > 60 ? 'bg-green-500' : signals.signal_strength < 40 ? 'bg-red-500' : 'bg-gray-400'}`}
                  style={{ width: `${signals.signal_strength}%` }}
                />
              </div>
              <span className="text-sm font-medium">{signals.signal_strength}%</span>
            </div>
          </div>
        </div>

        {/* Buy/Sell Signals */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Buy Signals ({signals.buy_signals.length})
            </h4>
            <ul className="space-y-1">
              {signals.buy_signals.map((signal, idx) => (
                <li key={idx} className="text-sm text-gray-600">• {signal}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              Sell Signals ({signals.sell_signals.length})
            </h4>
            <ul className="space-y-1">
              {signals.sell_signals.map((signal, idx) => (
                <li key={idx} className="text-sm text-gray-600">• {signal}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Key Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Key Indicators
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* RSI */}
          {indicators.rsi && (
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">RSI (14)</div>
              <div className={`text-2xl font-bold ${getRSIColor(indicators.rsi)}`}>
                {indicators.rsi.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {indicators.rsi < 30 ? 'Oversold' : indicators.rsi > 70 ? 'Overbought' : 'Neutral'}
              </div>
            </div>
          )}

          {/* MACD */}
          {indicators.macd && indicators.macd_signal && (
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">MACD</div>
              <div className={`text-2xl font-bold ${indicators.macd > indicators.macd_signal ? 'text-green-600' : 'text-red-600'}`}>
                {indicators.macd.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Signal: {indicators.macd_signal.toFixed(2)}
              </div>
            </div>
          )}

          {/* Moving Averages */}
          {indicators.sma_20 && (
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">SMA 20</div>
              <div className="text-2xl font-bold">${indicators.sma_20.toFixed(2)}</div>
              <div className={`text-xs ${indicators.current_price > indicators.sma_20 ? 'text-green-600' : 'text-red-600'}`}>
                {indicators.current_price > indicators.sma_20 ? 'Above' : 'Below'}
              </div>
            </div>
          )}

          {indicators.sma_50 && (
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">SMA 50</div>
              <div className="text-2xl font-bold">${indicators.sma_50.toFixed(2)}</div>
              <div className={`text-xs ${indicators.current_price > indicators.sma_50 ? 'text-green-600' : 'text-red-600'}`}>
                {indicators.current_price > indicators.sma_50 ? 'Above' : 'Below'}
              </div>
            </div>
          )}

          {indicators.sma_200 && (
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">SMA 200</div>
              <div className="text-2xl font-bold">${indicators.sma_200.toFixed(2)}</div>
              <div className={`text-xs ${indicators.current_price > indicators.sma_200 ? 'text-green-600' : 'text-red-600'}`}>
                {indicators.current_price > indicators.sma_200 ? 'Above' : 'Below'}
              </div>
            </div>
          )}

          {/* Bollinger Bands */}
          {indicators.bb_upper && indicators.bb_lower && (
            <div className="border rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">Bollinger Bands</div>
              <div className="text-xs space-y-1">
                <div>Upper: ${indicators.bb_upper.toFixed(2)}</div>
                <div>Middle: ${indicators.bb_middle?.toFixed(2)}</div>
                <div>Lower: ${indicators.bb_lower.toFixed(2)}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {indicators.current_price >= indicators.bb_upper ? 'At Upper Band' :
                 indicators.current_price <= indicators.bb_lower ? 'At Lower Band' : 'Within Bands'}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


// Simple indicator badge component
export function IndicatorBadge({ ticker }: { ticker: string }) {
  const [signal, setSignal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const response = await api.get(`/stocks/${ticker}/signals`);
        setSignal(response.data.overall_signal);
      } catch (error) {
        console.error('Error fetching signal:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignal();
  }, [ticker]);

  if (loading) return <Skeleton className="h-6 w-24" />;
  if (!signal) return null;

  const getColor = () => {
    if (signal.includes('STRONG BUY')) return 'bg-green-600 text-white';
    if (signal.includes('BUY')) return 'bg-green-500 text-white';
    if (signal.includes('STRONG SELL')) return 'bg-red-600 text-white';
    if (signal.includes('SELL')) return 'bg-red-500 text-white';
    return 'bg-gray-500 text-white';
  };

  return (
    <Badge className={getColor()}>
      {signal}
    </Badge>
  );
}
