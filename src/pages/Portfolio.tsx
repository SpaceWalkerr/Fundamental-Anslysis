import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getRates, convert, getRegionConfig, type Currency } from "@/lib/region";
import { useRegion } from "@/hooks/use-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Trash2,
  RefreshCw,
  Briefcase,
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
  currency?: string;
  is_default: boolean;
}

type AssetType = "stock" | "gold" | "cash" | "other";

interface Holding {
  id: string;
  ticker: string;
  company_name?: string;
  asset_type?: AssetType;
  quantity: number;
  avg_cost_basis: number;
  total_cost: number;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
  currency?: string;
}

interface PortfolioSummary {
  portfolio_id: string;
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  gain_loss_pct: number;
  cagr?: number | null;
  holding_period_years?: number | null;
  num_holdings: number;
  allocation?: { asset_type: string; value: number; pct: number }[];
  best_performer?: { ticker: string; gain_loss_pct: number };
  worst_performer?: { ticker: string; gain_loss_pct: number };
}

const ASSET_META: Record<AssetType, { label: string; emoji: string; badge: string }> = {
  stock: { label: "Stock", emoji: "📈", badge: "bg-primary/10 text-primary" },
  gold: { label: "Gold", emoji: "🪙", badge: "bg-amber-100 text-amber-700" },
  cash: { label: "Cash", emoji: "💵", badge: "bg-emerald-50 text-emerald-700" },
  other: { label: "Other", emoji: "📦", badge: "bg-slate-100 text-slate-600" },
};

// Common ways to track gold with a live price (Yahoo Finance symbols).
const GOLD_TRACKERS = [
  { value: "GOLDBEES.NS", label: "Gold ETF — India (GOLDBEES, ≈1 unit)" },
  { value: "GLD", label: "Gold ETF — US (GLD, ≈1/10 oz)" },
  { value: "manual", label: "I'll enter the price myself (per gram/unit)" },
];

const EMPTY_FORM = {
  asset_type: "stock" as AssetType,
  ticker: "",
  company_name: "",
  quantity: "",
  buy_price: "",
  purchase_date: new Date().toISOString().split("T")[0],
  gold_tracker: "GOLDBEES.NS",
  manual_price: "",
  cash_label: "",
  notes: "",
};

const Portfolio = () => {
  const { toast } = useToast();
  const { region } = useRegion();
  // Default gold tracker by region: India → GOLDBEES (NSE), elsewhere → GLD.
  const goldDefault = getRegionConfig(region).market === "india" ? "GOLDBEES.NS" : "GLD";
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    gold_tracker: getRegionConfig().market === "india" ? "GOLDBEES.NS" : "GLD",
  }));

  const currency = selectedPortfolio?.currency === "USD" ? "USD" : "INR";
  const displayCurrency = currency as Currency;

  // Warm live FX rates once so mixed-currency holdings convert into the
  // portfolio's display currency; bump a tick to re-render when they arrive.
  const [fxTick, setFxTick] = useState(0);
  useEffect(() => {
    getRates().then(() => setFxTick((t) => t + 1));
  }, []);

  const KNOWN_CURRENCIES = ["INR", "USD", "GBP", "EUR", "AED", "SGD"];

  // A holding's native currency (falls back to the portfolio currency).
  const holdingCurrency = useCallback(
    (h: Holding): Currency => {
      const c = (h.currency || displayCurrency).toUpperCase();
      return (KNOWN_CURRENCIES.includes(c) ? c : displayCurrency) as Currency;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [displayCurrency]
  );

  // Convert a native-currency amount into the portfolio's display currency.
  const toDisplay = useCallback(
    (value: number, from: Currency) =>
      from === displayCurrency ? value : convert(value, from, displayCurrency),
    [displayCurrency]
  );

  // Format an amount in a specific currency (used for native per-row values).
  const fmtIn = useCallback(
    (value: number, cur: string) =>
      new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 2,
      }).format(value),
    []
  );

  const fmt = useCallback(
    (value: number) => fmtIn(value, currency),
    [fmtIn, currency]
  );

  // Client-side totals in the display currency (mirrors the backend rollup but
  // FX-converts each holding first, so mixed-currency portfolios total up
  // correctly). Backend summary still supplies CAGR / allocation / performers.
  const computed = useMemo(() => {
    let value = 0;
    let cost = 0;
    let mixed = false;
    for (const h of holdings) {
      const from = holdingCurrency(h);
      if (from !== displayCurrency) mixed = true;
      const c = Number(h.total_cost || 0);
      const v =
        h.current_value !== undefined && h.current_value !== null
          ? Number(h.current_value)
          : c;
      cost += toDisplay(c, from);
      value += toDisplay(v, from);
    }
    const gain = value - cost;
    const pct = cost > 0 ? (gain / cost) * 100 : 0;
    return { value, cost, gain, pct, mixed };
    // fxTick forces recompute once live rates land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, displayCurrency, holdingCurrency, toDisplay, fxTick]);

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

  const formatQty = (q: number) =>
    q.toLocaleString(undefined, { maximumFractionDigits: 4 });

  useEffect(() => {
    loadPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPortfolio) loadPortfolioData(selectedPortfolio.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      const data = await api.portfolio.getPortfolios();
      setPortfolios(data);
      const defaultPortfolio = data.find((p: Portfolio) => p.is_default) || data[0];
      if (defaultPortfolio) setSelectedPortfolio(defaultPortfolio);
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
    setRefreshing(true);
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
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreatePortfolio = async () => {
    setCreating(true);
    try {
      const created = await api.portfolio.createPortfolio({
        name: "My Portfolio",
        description: "All my investments in one place",
        currency,
        is_default: true,
      });
      setPortfolios([created]);
      setSelectedPortfolio(created);
      toast({
        title: "Portfolio created",
        description: "Now add your first investment — stocks, gold, cash, anything.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create portfolio",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAddHolding = async () => {
    if (!selectedPortfolio) return;
    const t = form.asset_type;

    // Per-type validation, friendly messages
    if (t === "stock" && !form.ticker.trim()) {
      toast({ title: "Ticker required", description: "e.g. RELIANCE.NS for NSE, AAPL for US.", variant: "destructive" });
      return;
    }
    if (t === "cash" && !form.cash_label.trim()) {
      toast({ title: "Give this cash a name", description: "e.g. HDFC Savings, Emergency fund.", variant: "destructive" });
      return;
    }
    if (t === "other" && !form.cash_label.trim()) {
      toast({ title: "Name this investment", description: "e.g. Fixed Deposit, Real Estate, Bitcoin.", variant: "destructive" });
      return;
    }
    const qty = parseFloat(form.quantity);
    if (!qty || qty <= 0) {
      toast({ title: "Quantity required", description: t === "cash" ? "Enter the cash amount." : "Enter how many units you hold.", variant: "destructive" });
      return;
    }
    const buyPrice = t === "cash" ? 1 : parseFloat(form.buy_price) || 0;
    if (t !== "cash" && buyPrice <= 0) {
      toast({ title: "Buy price required", description: "What did you pay per unit?", variant: "destructive" });
      return;
    }

    // Build the payload per asset type
    const payload: any = {
      asset_type: t,
      quantity: qty,
      avg_cost_basis: buyPrice,
      purchase_date: form.purchase_date ? new Date(form.purchase_date).toISOString() : undefined,
      currency,
      notes: form.notes || undefined,
    };
    if (t === "stock") {
      payload.ticker = form.ticker.trim().toUpperCase();
      payload.company_name = form.company_name || form.ticker.trim().toUpperCase();
      payload.live_ticker = form.ticker.trim().toUpperCase();
    } else if (t === "gold") {
      payload.ticker = "GOLD";
      payload.company_name = "Gold";
      if (form.gold_tracker === "manual") {
        payload.manual_price = parseFloat(form.manual_price) || buyPrice;
      } else {
        payload.live_ticker = form.gold_tracker;
      }
    } else if (t === "cash") {
      payload.ticker = `CASH-${form.cash_label.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 24)}`;
      payload.company_name = form.cash_label.trim();
    } else {
      payload.ticker = `OTHER-${form.cash_label.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 24)}`;
      payload.company_name = form.cash_label.trim();
      payload.manual_price = parseFloat(form.manual_price) || buyPrice;
    }

    setSaving(true);
    try {
      await api.portfolio.addHolding(selectedPortfolio.id, payload);
      toast({
        title: "Added to your portfolio",
        description: `${payload.company_name} is now being tracked.`,
      });
      setForm({ ...EMPTY_FORM, gold_tracker: goldDefault });
      setShowAddDialog(false);
      loadPortfolioData(selectedPortfolio.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add holding",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHolding = async (holding: Holding) => {
    if (!selectedPortfolio) return;
    if (!window.confirm(`Remove ${holding.company_name || holding.ticker} from your portfolio?`)) return;
    try {
      await api.portfolio.deleteHolding(selectedPortfolio.id, holding.ticker);
      toast({ title: "Removed", description: `${holding.company_name || holding.ticker} removed.` });
      loadPortfolioData(selectedPortfolio.id);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove holding", variant: "destructive" });
    }
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
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Your whole net worth, one page</h2>
          <p className="text-muted-foreground max-w-md">
            Stocks from any market, gold, cash, FDs — add everything you own and
            watch live value, total return and CAGR in one place.
          </p>
          <Button
            onClick={handleCreatePortfolio}
            disabled={creating}
            className="bg-primary text-white hover:bg-primary/90 gap-2 mt-2"
            size="lg"
          >
            <Plus className="w-4 h-4" />
            {creating ? "Creating..." : "Create My Portfolio"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {selectedPortfolio.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Every investment you own — live, in one place
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadPortfolioData(selectedPortfolio.id)}
              disabled={refreshing}
              title="Refresh live prices"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white hover:bg-primary/90 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Investment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add an investment</DialogTitle>
                  <DialogDescription>
                    Anything you own — we'll fetch live prices where possible.
                  </DialogDescription>
                </DialogHeader>

                {/* Asset type picker */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(Object.keys(ASSET_META) as AssetType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, asset_type: t })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        form.asset_type === t
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-xl">{ASSET_META[t].emoji}</div>
                      <div className="text-xs font-semibold text-foreground mt-1">
                        {ASSET_META[t].label}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 mt-2">
                  {/* STOCK */}
                  {form.asset_type === "stock" && (
                    <>
                      <div>
                        <Label htmlFor="ticker">Ticker symbol</Label>
                        <Input
                          id="ticker"
                          placeholder="RELIANCE.NS · TCS.NS · AAPL · MSFT"
                          value={form.ticker}
                          onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Indian stocks need <span className="font-mono">.NS</span> (e.g. RELIANCE.NS). US stocks as-is (AAPL).
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="qty">Shares</Label>
                          <Input id="qty" type="number" step="any" placeholder="10"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor="buy">Buy price / share</Label>
                          <Input id="buy" type="number" step="any" placeholder="2450"
                            value={form.buy_price}
                            onChange={(e) => setForm({ ...form, buy_price: e.target.value })} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* GOLD */}
                  {form.asset_type === "gold" && (
                    <>
                      <div>
                        <Label>How do you hold it?</Label>
                        <Select
                          value={form.gold_tracker}
                          onValueChange={(v) => setForm({ ...form, gold_tracker: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GOLD_TRACKERS.map((g) => (
                              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="gqty">{form.gold_tracker === "manual" ? "Grams / units" : "Units"}</Label>
                          <Input id="gqty" type="number" step="any" placeholder="10"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor="gbuy">Buy price / unit</Label>
                          <Input id="gbuy" type="number" step="any" placeholder="6500"
                            value={form.buy_price}
                            onChange={(e) => setForm({ ...form, buy_price: e.target.value })} />
                        </div>
                      </div>
                      {form.gold_tracker === "manual" && (
                        <div>
                          <Label htmlFor="gnow">Current price / unit</Label>
                          <Input id="gnow" type="number" step="any" placeholder="7200"
                            value={form.manual_price}
                            onChange={(e) => setForm({ ...form, manual_price: e.target.value })} />
                          <p className="text-xs text-muted-foreground mt-1">Update anytime by re-adding with the latest price.</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* CASH */}
                  {form.asset_type === "cash" && (
                    <>
                      <div>
                        <Label htmlFor="clabel">Where is this cash?</Label>
                        <Input id="clabel" placeholder="HDFC Savings · Emergency fund"
                          value={form.cash_label}
                          onChange={(e) => setForm({ ...form, cash_label: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="camt">Amount</Label>
                        <Input id="camt" type="number" step="any" placeholder="150000"
                          value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                    </>
                  )}

                  {/* OTHER */}
                  {form.asset_type === "other" && (
                    <>
                      <div>
                        <Label htmlFor="olabel">What is it?</Label>
                        <Input id="olabel" placeholder="Fixed Deposit · Real Estate · Bitcoin"
                          value={form.cash_label}
                          onChange={(e) => setForm({ ...form, cash_label: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="oqty">Units</Label>
                          <Input id="oqty" type="number" step="any" placeholder="1"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        </div>
                        <div>
                          <Label htmlFor="obuy">Buy price / unit</Label>
                          <Input id="obuy" type="number" step="any" placeholder="500000"
                            value={form.buy_price}
                            onChange={(e) => setForm({ ...form, buy_price: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="onow">Current value / unit</Label>
                        <Input id="onow" type="number" step="any" placeholder="560000"
                          value={form.manual_price}
                          onChange={(e) => setForm({ ...form, manual_price: e.target.value })} />
                        <p className="text-xs text-muted-foreground mt-1">No live feed for this one — update it whenever you like.</p>
                      </div>
                    </>
                  )}

                  {/* Purchase date (all except cash) */}
                  {form.asset_type !== "cash" && (
                    <div>
                      <Label htmlFor="pdate">When did you buy it?</Label>
                      <Input id="pdate" type="date" value={form.purchase_date}
                        onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                      <p className="text-xs text-muted-foreground mt-1">Used to calculate your CAGR (annualised return).</p>
                    </div>
                  )}

                  <Button onClick={handleAddHolding} disabled={saving} className="w-full bg-primary text-white hover:bg-primary/90">
                    {saving ? "Adding..." : "Add to Portfolio"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{fmt(computed.value)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Invested: {fmt(computed.cost)}
                </p>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Return</span>
                  {computed.gain >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${computed.gain >= 0 ? "text-success" : "text-destructive"}`}>
                  {fmt(computed.gain)}
                </div>
                <p className={`text-xs mt-1 ${computed.pct >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatPercent(computed.pct)} overall
                </p>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">CAGR</span>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                {summary.cagr !== null && summary.cagr !== undefined ? (
                  <>
                    <div className={`text-2xl font-bold ${summary.cagr >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatPercent(summary.cagr)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      per year over {summary.holding_period_years?.toFixed(1)} yrs
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">—</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add buy dates to unlock CAGR
                    </p>
                  </>
                )}
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Allocation</span>
                  <PieChart className="w-4 h-4 text-primary" />
                </div>
                {summary.allocation && summary.allocation.length > 0 ? (
                  <div className="space-y-1.5">
                    {summary.allocation.slice(0, 4).map((a) => (
                      <div key={a.asset_type} className="flex items-center justify-between text-sm">
                        <span className="text-foreground capitalize">
                          {ASSET_META[a.asset_type as AssetType]?.emoji} {a.asset_type}
                        </span>
                        <span className="font-semibold text-foreground">{a.pct}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Add investments to see your mix</div>
                )}
              </Card>
            </motion.div>
          </div>
        )}

        {/* Holdings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl bg-white border border-border overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Holdings</h2>
            <span className="text-xs text-muted-foreground">
              Prices refresh on load · rows in each asset's native currency
              {computed.mixed && (
                <> · totals converted to {currency === "INR" ? "₹ INR" : "$ USD"} at live rates</>
              )}
            </span>
          </div>

          {holdings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🗂️</div>
              <p className="font-semibold text-foreground mb-1">Nothing here yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first investment — a stock, your gold, even the cash in your bank.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-white hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" /> Add Investment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Asset</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Type</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Quantity</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Avg Cost</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Current Price</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Value</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Gain/Loss</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const atype = (holding.asset_type || "stock") as AssetType;
                    const meta = ASSET_META[atype];
                    const hc = holdingCurrency(holding);
                    return (
                      <tr key={holding.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="font-semibold text-foreground">{holding.company_name || holding.ticker}</p>
                          {atype === "stock" && (
                            <p className="text-xs text-muted-foreground">{holding.ticker}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
                            {meta.emoji} {meta.label}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-foreground">
                          {atype === "cash" ? "—" : formatQty(holding.quantity)}
                        </td>
                        <td className="py-4 px-4 text-right text-foreground">
                          {atype === "cash" ? "—" : fmtIn(holding.avg_cost_basis, hc)}
                        </td>
                        <td className="py-4 px-4 text-right text-foreground">
                          {atype === "cash" ? "—" : holding.current_price ? fmtIn(holding.current_price, hc) : "–"}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-foreground">
                          {holding.current_value !== undefined && holding.current_value !== null
                            ? fmtIn(holding.current_value, hc)
                            : "–"}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {atype !== "cash" && holding.gain_loss !== undefined && holding.gain_loss !== null ? (
                            <div>
                              <div className={`font-medium ${holding.gain_loss >= 0 ? "text-success" : "text-destructive"}`}>
                                {fmtIn(holding.gain_loss, hc)}
                              </div>
                              {holding.gain_loss_pct !== undefined && (
                                <div className={`text-xs ${(holding.gain_loss_pct || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                                  {formatPercent(holding.gain_loss_pct || 0)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <button
                            onClick={() => handleDeleteHolding(holding)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove holding"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
