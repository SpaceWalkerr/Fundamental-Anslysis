import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
}

interface Holding {
  id: string;
  ticker: string;
  company_name?: string;
  quantity: number;
  avg_cost_basis: number;
  total_cost: number;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
}

interface PortfolioSummary {
  portfolio_id: string;
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  gain_loss_pct: number;
  num_holdings: number;
  best_performer?: { ticker: string; gain_loss_pct: number };
  worst_performer?: { ticker: string; gain_loss_pct: number };
}

const Portfolio = () => {
  const { toast } = useToast();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionData, setTransactionData] = useState({
    ticker: "",
    transaction_type: "BUY",
    quantity: "",
    price_per_share: "",
    fees: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadPortfolioData(selectedPortfolio.id);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      const data = await api.portfolio.getPortfolios();
      setPortfolios(data);
      
      // Select default or first portfolio
      const defaultPortfolio = data.find((p: Portfolio) => p.is_default) || data[0];
      if (defaultPortfolio) {
        setSelectedPortfolio(defaultPortfolio);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load portfolios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioData = async (portfolioId: string) => {
    try {
      const [holdingsData, summaryData] = await Promise.all([
        api.portfolio.getHoldings(portfolioId, true),
        api.portfolio.getSummary(portfolioId),
      ]);
      
      setHoldings(holdingsData);
      setSummary(summaryData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load portfolio data",
        variant: "destructive",
      });
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedPortfolio) return;
    
    try {
      await api.portfolio.addTransaction(selectedPortfolio.id, {
        ticker: transactionData.ticker.toUpperCase(),
        transaction_type: transactionData.transaction_type as "BUY" | "SELL",
        quantity: parseFloat(transactionData.quantity),
        price_per_share: parseFloat(transactionData.price_per_share),
        fees: transactionData.fees ? parseFloat(transactionData.fees) : 0,
        transaction_date: new Date(transactionData.transaction_date).toISOString(),
        notes: transactionData.notes,
      });

      toast({
        title: "Transaction Added",
        description: `Successfully added ${transactionData.transaction_type} transaction for ${transactionData.ticker}`,
      });

      // Reset form
      setTransactionData({
        ticker: "",
        transaction_type: "BUY",
        quantity: "",
        price_per_share: "",
        fees: "",
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      
      setShowTransactionDialog(false);
      
      // Reload portfolio data
      loadPortfolioData(selectedPortfolio.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-muted-foreground">Loading portfolio...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedPortfolio) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <p className="text-muted-foreground">No portfolios found</p>
          <Button>Create Portfolio</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              {selectedPortfolio.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your investments and performance
            </p>
          </div>
          
          <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
                <DialogDescription>
                  Record a buy or sell transaction for your portfolio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ticker">Ticker</Label>
                    <Input
                      id="ticker"
                      placeholder="AAPL"
                      value={transactionData.ticker}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, ticker: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={transactionData.transaction_type}
                      onValueChange={(v) =>
                        setTransactionData({ ...transactionData, transaction_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.0001"
                      placeholder="10"
                      value={transactionData.quantity}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, quantity: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price per Share</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="150.00"
                      value={transactionData.price_per_share}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, price_per_share: e.target.value })
                      }
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fees">Fees (optional)</Label>
                    <Input
                      id="fees"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transactionData.fees}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, fees: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={transactionData.transaction_date}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, transaction_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add notes about this transaction"
                    value={transactionData.notes}
                    onChange={(e) =>
                      setTransactionData({ ...transactionData, notes: e.target.value })
                    }
                  />
                </div>
                
                <Button onClick={handleAddTransaction} className="w-full">
                  Add Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary.total_value)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cost: {formatCurrency(summary.total_cost)}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Gain/Loss</span>
                  {summary.total_gain_loss >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    summary.total_gain_loss >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(summary.total_gain_loss)}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    summary.gain_loss_pct >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatPercent(summary.gain_loss_pct)}
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Holdings</span>
                  <PieChart className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {summary.num_holdings}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active positions
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Best Performer</span>
                  <Activity className="w-4 h-4 text-success" />
                </div>
                {summary.best_performer ? (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      {summary.best_performer.ticker}
                    </div>
                    <p className="text-xs text-success mt-1">
                      {formatPercent(summary.best_performer.gain_loss_pct)}
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </Card>
            </motion.div>
          </div>
        )}

        {/* Holdings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl bg-card border border-border overflow-hidden"
        >
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Holdings</h2>
          </div>

          {holdings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p>No holdings yet. Add your first transaction to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Symbol
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Quantity
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Avg Cost
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Current Price
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Market Value
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                      Gain/Loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr
                      key={holding.id}
                      className="border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-foreground">{holding.ticker}</p>
                          {holding.company_name && (
                            <p className="text-xs text-muted-foreground">
                              {holding.company_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-foreground">
                        {holding.quantity.toFixed(4)}
                      </td>
                      <td className="py-4 px-4 text-right text-foreground">
                        {formatCurrency(holding.avg_cost_basis)}
                      </td>
                      <td className="py-4 px-4 text-right text-foreground">
                        {holding.current_price
                          ? formatCurrency(holding.current_price)
                          : "-"}
                      </td>
                      <td className="py-4 px-4 text-right text-foreground">
                        {holding.current_value
                          ? formatCurrency(holding.current_value)
                          : "-"}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {holding.gain_loss !== undefined ? (
                          <div>
                            <div
                              className={`font-medium ${
                                holding.gain_loss >= 0 ? "text-success" : "text-destructive"
                              }`}
                            >
                              {formatCurrency(holding.gain_loss)}
                            </div>
                            {holding.gain_loss_pct !== undefined && (
                              <div
                                className={`text-xs ${
                                  holding.gain_loss_pct >= 0 ? "text-success" : "text-destructive"
                                }`}
                              >
                                {formatPercent(holding.gain_loss_pct)}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;
