import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, downloadBlob } from "@/lib/api";
import { usePlanStore } from "@/store/usePlanStore";
import { useRegion } from "@/hooks/use-region";
import { getRegionConfig } from "@/lib/region";
import { Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Filter,
  Plus,
  X,
  Play,
  Save,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Download,
} from "lucide-react";

interface FilterItem {
  id: string;
  field: string;
  operator: string;
  value: string;
}

// Full custom-criteria set. Users aren't limited to a handful — they can
// screen on any of these fundamentals (grouped for readability in the picker).
const filterFieldGroups = [
  {
    group: "Classification",
    fields: [
      { value: "sector", label: "Sector" },
      { value: "market_cap", label: "Market Cap" },
      { value: "price", label: "Price" },
    ],
  },
  {
    group: "Valuation",
    fields: [
      { value: "pe_ratio", label: "P/E Ratio" },
      { value: "peg_ratio", label: "PEG Ratio" },
      { value: "pb_ratio", label: "Price / Book" },
      { value: "eps", label: "EPS" },
      { value: "dividend_yield", label: "Dividend Yield %" },
    ],
  },
  {
    group: "Profitability",
    fields: [
      { value: "profit_margin", label: "Net Margin %" },
      { value: "operating_margin", label: "Operating Margin %" },
      { value: "roe", label: "ROE %" },
      { value: "roa", label: "ROA %" },
    ],
  },
  {
    group: "Growth",
    fields: [
      { value: "revenue_growth", label: "Revenue Growth %" },
      { value: "earnings_growth", label: "Earnings Growth %" },
    ],
  },
  {
    group: "Financial health",
    fields: [
      { value: "debt_to_equity", label: "Debt / Equity" },
      { value: "current_ratio", label: "Current Ratio" },
      { value: "quick_ratio", label: "Quick Ratio" },
    ],
  },
  {
    group: "Risk",
    fields: [{ value: "beta", label: "Beta (volatility)" }],
  },
];

// Flat list for label lookups (PDF export, etc.).
const filterFields = filterFieldGroups.flatMap((g) => g.fields);

const operators = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
];

// One-click "starter screens" — the way beginners actually use a screener.
// Each loads a sensible, named strategy instead of asking a layman to build
// filters from scratch (the Finviz / Screener.in / Simply Wall St pattern).
interface Preset {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  plain: string; // plain-English "what this finds"
  filters: { field: string; operator: string; value: string }[];
}

const PRESETS: Preset[] = [
  {
    id: "value",
    name: "Undervalued Gems",
    emoji: "💎",
    tagline: "Cheap vs earnings, still profitable",
    plain: "Solid companies trading at a low price relative to their profits — classic value picks.",
    filters: [
      { field: "pe_ratio", operator: "lt", value: "20" },
      { field: "roe", operator: "gte", value: "15" },
      { field: "debt_to_equity", operator: "lt", value: "1" },
    ],
  },
  {
    id: "growth",
    name: "Fast Growers",
    emoji: "🚀",
    tagline: "Rapid revenue growth",
    plain: "Companies growing sales quickly with healthy margins — where tomorrow's leaders hide.",
    filters: [
      { field: "revenue_growth", operator: "gte", value: "20" },
      { field: "profit_margin", operator: "gte", value: "10" },
    ],
  },
  {
    id: "quality",
    name: "Quality Compounders",
    emoji: "🏆",
    tagline: "High returns, low debt",
    plain: "Highly profitable, well-run businesses with little debt — the kind you can hold for years.",
    filters: [
      { field: "roe", operator: "gte", value: "20" },
      { field: "profit_margin", operator: "gte", value: "15" },
      { field: "debt_to_equity", operator: "lt", value: "0.5" },
    ],
  },
  {
    id: "dividend",
    name: "Income Machines",
    emoji: "💰",
    tagline: "Reliable dividend payers",
    plain: "Companies paying a healthy, well-covered dividend — steady cash in your pocket.",
    filters: [
      { field: "dividend_yield", operator: "gte", value: "3" },
      { field: "current_ratio", operator: "gte", value: "1.2" },
    ],
  },
];

const sectorOptions = [
  "Technology",
  "Healthcare",
  "Financials",
  "Consumer Discretionary",
  "Communication Services",
  "Industrials",
  "Energy",
  "Materials",
  "Utilities",
  "Real Estate",
];

const mockResults = [
  {
    ticker: "MSFT",
    company: "Microsoft Corporation",
    sector: "Technology",
    price: 415.25,
    marketCap: "3.1T",
    peRatio: 28.5,
    revenueGrowth: 16.2,
    profitMargin: 35.8,
    matchScore: 95,
  },
  {
    ticker: "AAPL",
    company: "Apple Inc.",
    sector: "Technology",
    price: 225.50,
    marketCap: "2.8T",
    peRatio: 28.5,
    revenueGrowth: 2.8,
    profitMargin: 25.5,
    matchScore: 88,
  },
  {
    ticker: "NVDA",
    company: "NVIDIA Corporation",
    sector: "Technology",
    price: 880.25,
    marketCap: "2.2T",
    peRatio: 65.2,
    revenueGrowth: 126.0,
    profitMargin: 52.1,
    matchScore: 85,
  },
  {
    ticker: "META",
    company: "Meta Platforms Inc.",
    sector: "Technology",
    price: 520.80,
    marketCap: "1.3T",
    peRatio: 20.1,
    revenueGrowth: 19.5,
    profitMargin: 29.0,
    matchScore: 82,
  },
  {
    ticker: "GOOGL",
    company: "Alphabet Inc.",
    sector: "Technology",
    price: 178.90,
    marketCap: "2.2T",
    peRatio: 22.5,
    revenueGrowth: 11.0,
    profitMargin: 24.0,
    matchScore: 78,
  },
];

const StockScanner = () => {
  const { toast } = useToast();
  const isPro = usePlanStore((s) => s.isPro)();
  const { region } = useRegion();
  const [filters, setFilters] = useState<FilterItem[]>([
    { id: "1", field: "sector", operator: "eq", value: "Technology" },
    { id: "2", field: "market_cap", operator: "gte", value: "10000000000" },
  ]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  // Default the scanning universe to the visitor's region (India users → NSE,
  // everyone else → US); they can still switch markets manually.
  const [market, setMarket] = useState<"india" | "us">(getRegionConfig().market);
  const [marketTouched, setMarketTouched] = useState(false);

  // Follow the region default until the user explicitly picks a market.
  useEffect(() => {
    if (!marketTouched) setMarket(getRegionConfig(region).market);
  }, [region, marketTouched]);
  const [results, setResults] = useState(mockResults);
  const [sortField, setSortField] = useState("matchScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Pro users see live data on entry (and when the market changes); free users
  // see the curated sample preview until they upgrade.
  useEffect(() => {
    if (isPro) loadAllStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, market]);

  const loadAllStocks = async () => {
    setIsScanning(true);
    try {
      // Load all stocks with no filters
      const response = await api.stocks.screenStocks({
        filters: [],
        sort_by: "market_cap",
        sort_order: "desc",
        limit: 100,
        market,
      });

      // Transform response to frontend format
      const transformedResults = response.map((stock: any) => ({
        ticker: stock.ticker,
        company: stock.company,
        sector: stock.sector,
        price: stock.price,
        marketCap: stock.market_cap,
        peRatio: stock.pe_ratio,
        revenueGrowth: stock.revenue_growth || 0,
        profitMargin: stock.profit_margin || 0,
        matchScore: stock.match_score || 85,
      }));

      setResults(transformedResults);
    } catch (error: any) {
      console.error("Failed to load stocks:", error);
      // Keep mock results if API fails
    } finally {
      setIsScanning(false);
    }
  };

  const addFilter = () => {
    const newFilter: FilterItem = {
      id: Date.now().toString(),
      field: "pe_ratio",
      operator: "lt",
      value: "",
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (
    id: string,
    field: keyof FilterItem,
    value: string
  ) => {
    setFilters(
      filters.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Load a starter screen's filters. Free users can build/preview freely —
  // the Pro gate only bites when they RUN it for live results.
  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setFilters(
      preset.filters.map((f, i) => ({ id: `${preset.id}-${i}`, ...f }))
    );
    setHasRun(false);
  };

  const runScan = async () => {
    // Enter-free / run-Pro: anyone can build a screen and see the sample
    // preview, but running it against live data is the paid moment.
    if (!isPro) {
      usePlanStore.getState().openUpgrade("screener");
      return;
    }
    setHasRun(true);
    setIsScanning(true);
    try {
      // Transform filters to backend format (remove id field)
      const backendFilters = filters
        .filter((f) => f.value !== "") // Only include filters with values
        .map(({ field, operator, value }) => ({
          field,
          operator,
          value,
        }));

      // Call the real API
      const response = await api.stocks.screenStocks({
        filters: backendFilters,
        sort_by: sortField === "matchScore" ? "match_score" : sortField === "peRatio" ? "pe_ratio" : sortField === "marketCap" ? "market_cap" : sortField,
        sort_order: sortOrder,
        limit: 100,
        market,
      });

      // Transform response to frontend format (snake_case to camelCase)
      const transformedResults = response.map((stock: any) => ({
        ticker: stock.ticker,
        company: stock.company,
        sector: stock.sector,
        price: stock.price,
        marketCap: stock.market_cap,
        peRatio: stock.pe_ratio,
        revenueGrowth: stock.revenue_growth || 0,
        profitMargin: stock.profit_margin || 0,
        matchScore: stock.match_score || 85,
      }));

      setResults(transformedResults);

      toast({
        title: "Scan Complete",
        description: `Found ${transformedResults.length} matching stocks`,
      });
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to screen stocks. Please try again.",
        variant: "destructive",
      });
      console.error("Screening error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleExportPDF = async () => {
    if (results.length === 0) {
      toast({
        title: "No Results",
        description: "Run a scan first to get results to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Calculate average score
      const avgScore = results.reduce((sum, stock) => sum + stock.matchScore, 0) / results.length;

      // Get unique sectors and counts
      const sectorCounts: Record<string, number> = {};
      results.forEach((stock) => {
        sectorCounts[stock.sector] = (sectorCounts[stock.sector] || 0) + 1;
      });
      const topSectors = Object.entries(sectorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Prepare screening data
      const screeningData = {
        description: `Custom stock screening with ${filters.length} filter(s) applied`,
        total_matches: results.length,
        stocks: results.map((stock) => ({
          ticker: stock.ticker,
          name: stock.company,
          price: stock.price,
          market_cap: stock.marketCap,
          pe_ratio: stock.peRatio,
          score: stock.matchScore,
        })),
        filters: filters.map((f) => ({
          field: filterFields.find((ff) => ff.value === f.field)?.label || f.field,
          operator: operators.find((op) => op.value === f.operator)?.label || f.operator,
          value: f.value,
        })),
        average_score: avgScore,
        top_sectors: topSectors,
      };

      // Export PDF
      const blob = await api.pdf.exportScreening("Stock Screening Results", screeningData);
      downloadBlob(blob, `screening_results.pdf`);

      toast({
        title: "PDF Exported",
        description: "Your screening results have been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Stock Scanner
            </h1>
            <span className="px-2 py-1 rounded bg-warning/10 text-warning text-xs font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Premium
            </span>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            A stock screener sifts through thousands of companies and surfaces only the ones
            that match what <em>you</em> care about — cheap, fast-growing, high-quality, or
            high-dividend. Pick a ready-made screen below, or build your own.
          </p>
        </motion.div>

        {/* Market selector — pick the universe first */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.03 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Market</span>
            <div className="inline-flex rounded-xl border border-border overflow-hidden">
              {([
                { id: "india", label: "🇮🇳 India (NSE)" },
                { id: "us", label: "🇺🇸 United States" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMarket(m.id); setMarketTouched(true); setActivePreset(null); }}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${
                    market === m.id ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Screens run against {market === "india" ? "Indian" : "US"} listed companies.</span>
          </div>
        </motion.div>

        {/* Starter screens — one click, no jargon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Start with a proven screen
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  activePreset === preset.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-white hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <div className="text-2xl mb-2">{preset.emoji}</div>
                <div className="font-bold text-foreground text-sm">{preset.name}</div>
                <div className="text-xs text-primary font-medium mb-1.5">{preset.tagline}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{preset.plain}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filter Builder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl bg-white border border-border p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filter Criteria
            </h2>
            <Button variant="outline" size="sm" onClick={addFilter} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Filter
            </Button>
          </div>

          <div className="space-y-3">
            {filters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
              >
                <Select
                  value={filter.field}
                  onValueChange={(v) => updateFilter(filter.id, "field", v)}
                >
                  <SelectTrigger className="w-52 bg-background">
                    <SelectValue placeholder="Select criteria" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {filterFieldGroups.map((grp) => (
                      <SelectGroup key={grp.group}>
                        <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {grp.group}
                        </SelectLabel>
                        {grp.fields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                {filter.field === "sector" ? (
                  <>
                    <span className="text-muted-foreground">=</span>
                    <Select
                      value={filter.value}
                      onValueChange={(v) => updateFilter(filter.id, "value", v)}
                    >
                      <SelectTrigger className="w-48 bg-background">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectorOptions.map((sector) => (
                          <SelectItem key={sector} value={sector}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Select
                      value={filter.operator}
                      onValueChange={(v) => updateFilter(filter.id, "operator", v)}
                    >
                      <SelectTrigger className="w-20 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="text"
                      placeholder="Value"
                      value={filter.value}
                      onChange={(e) =>
                        updateFilter(filter.id, "value", e.target.value)
                      }
                      className="w-32 bg-background"
                    />
                  </>
                )}

                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-auto p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <Button onClick={runScan} className="bg-primary text-white hover:bg-primary/90 gap-2" disabled={isScanning}>
              {isPro ? <Play className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isScanning ? "Scanning..." : isPro ? "Run Scan" : "Run Scan on Live Data"}
            </Button>
            {!isPro && (
              <span className="text-[10px] font-extrabold px-2 py-1 rounded bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                PRO
              </span>
            )}
            <Button variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              Save Screener
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setFilters([]); setActivePreset(null); }}
              className="text-muted-foreground"
            >
              Clear All
            </Button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground mt-3">
              Build and preview any screen for free. <span className="font-semibold text-foreground">Pro</span> runs it live against the full market and shows every match.
            </p>
          )}
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-white border border-border overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">
                {isPro ? `Results (${results.length} matches)` : "Sample results"}
              </h2>
              {!isPro && (
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  Preview — live results are Pro
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => (isPro ? handleExportPDF() : usePlanStore.getState().openUpgrade("export"))}
              disabled={isExporting || results.length === 0}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>

          {/* Free-tier value banner: they see a real taste, then the unlock */}
          {!isPro && (
            <div
              className="px-4 py-3 bg-primary/5 border-b border-primary/15 flex items-center gap-3 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => usePlanStore.getState().openUpgrade("screener")}
            >
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                This is a sample of what a screen returns. <span className="font-semibold text-foreground">Go Pro</span> to
                run this against the entire market, see every match ranked, and export the list.
              </p>
              <span className="text-sm font-bold text-primary whitespace-nowrap">Unlock →</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">
                    Sector
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("price")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Price
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("marketCap")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Mkt Cap
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("peRatio")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      P/E
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("revenueGrowth")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Rev Growth
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("profitMargin")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Margin
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("matchScore")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Match
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock) => (
                  <tr
                    key={stock.ticker}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-foreground">
                          {stock.ticker}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stock.company}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full bg-accent/30 text-xs text-primary font-medium">
                        {stock.sector}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-foreground">
                      ${stock.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right text-foreground">
                      ${stock.marketCap}
                    </td>
                    <td className="py-4 px-4 text-right text-foreground">
                      {stock.peRatio}x
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`flex items-center justify-end gap-1 ${
                          stock.revenueGrowth >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {stock.revenueGrowth >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {stock.revenueGrowth}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-foreground">
                      {stock.profitMargin}%
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-20 space-y-1">
                          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stock.matchScore}%` }}
                              transition={{ delay: 0.1, duration: 0.8 }}
                              className={`h-full rounded-full ${
                                stock.matchScore >= 90
                                  ? "bg-primary"
                                  : stock.matchScore >= 75
                                  ? "bg-primary/70"
                                  : "bg-warning"
                              }`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {stock.matchScore >= 90
                              ? "Excellent"
                              : stock.matchScore >= 75
                              ? "Good"
                              : "Fair"}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          stock.matchScore >= 90
                            ? "text-success"
                            : stock.matchScore >= 75
                            ? "text-primary"
                            : "text-warning"
                        }`}>
                          {stock.matchScore}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default StockScanner;
