import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, downloadBlob } from "@/lib/api";
import {
  Select,
  SelectContent,
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

const filterFields = [
  { value: "sector", label: "Sector" },
  { value: "market_cap", label: "Market Cap" },
  { value: "pe_ratio", label: "P/E Ratio" },
  { value: "revenue_growth", label: "Revenue Growth %" },
  { value: "profit_margin", label: "Profit Margin %" },
  { value: "roe", label: "ROE %" },
  { value: "debt_to_equity", label: "Debt/Equity" },
  { value: "dividend_yield", label: "Dividend Yield %" },
  { value: "current_ratio", label: "Current Ratio" },
];

const operators = [
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "eq", label: "=" },
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
  const [filters, setFilters] = useState<FilterItem[]>([
    { id: "1", field: "sector", operator: "eq", value: "Technology" },
    { id: "2", field: "market_cap", operator: "gte", value: "10000000000" },
  ]);
  const [results, setResults] = useState(mockResults);
  const [sortField, setSortField] = useState("matchScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Load all stocks on initial mount
  useEffect(() => {
    loadAllStocks();
  }, []);

  const loadAllStocks = async () => {
    setIsScanning(true);
    try {
      // Load all stocks with no filters
      const response = await api.stocks.screenStocks({
        filters: [],
        sort_by: "market_cap",
        sort_order: "desc",
        limit: 100,
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

  const runScan = async () => {
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
          <p className="text-muted-foreground">
            Screen stocks by custom financial criteria
          </p>
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
                  <SelectTrigger className="w-44 bg-background">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
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

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={runScan} className="bg-primary text-white hover:bg-primary/90 gap-2" disabled={isScanning}>
              <Play className="w-4 h-4" />
              {isScanning ? "Scanning..." : "Run Scan"}
            </Button>
            <Button variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              Save Screener
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilters([])}
              className="text-muted-foreground"
            >
              Clear All
            </Button>
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-white border border-border overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Results ({results.length} matches)
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportPDF}
              disabled={isExporting || results.length === 0}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>

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
