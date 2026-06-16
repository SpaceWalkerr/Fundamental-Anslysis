import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import CompanySearchResults from "@/components/CompanySearchResults";
import Logo from "@/components/brand/Logo";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";

const Hero = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleAnalyze = async (company: any) => {
    if (isAnalyzing) return;

    if (!isAuthenticated) {
      navigate(`/dashboard/analyze?ticker=${company.ticker}&name=${encodeURIComponent(company.name)}`);
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await api.analysis.checkReportExists(company.ticker);
      if (res && res.exists && res.report_id) {
        navigate(`/dashboard/report/${res.report_id}`);
      } else {
        const analysisRes = await api.analysis.analyzeFile(null, company.name, company.ticker);
        navigate(`/dashboard/report/${analysisRes.reportId}`);
      }
    } catch (err) {
      console.error("Error checking or generating report:", err);
      // Fallback
      navigate(`/dashboard/analyze?ticker=${company.ticker}&name=${encodeURIComponent(company.name)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pills = [
    "Reliance", "TCS", "Infosys",
    "HDFC Bank", "Apple", "Microsoft"
  ];

  return (
    <section className="min-h-screen flex items-center justify-center bg-[#F2F6F9] pt-20 px-4">
      <div className="w-full max-w-[700px] flex flex-col items-center">
        
        {/* App Logo */}
        <div className="flex items-center justify-center mb-6">
          <Logo size="xl" />
        </div>

        {/* Subtitle */}
        <p className="text-[17px] text-[#4a4a4a] mb-10 text-center">
          Institutional-Grade Fundamental Analysis for Everyone.
        </p>

        {/* Search Bar Container */}
        <div className="w-full relative mb-8" ref={searchRef}>
          <div className={`flex items-center w-full bg-white rounded-md border ${isFocused ? "border-primary shadow-md ring-1 ring-primary/20" : "border-gray-200"} transition-all duration-200`}>
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 text-primary ml-4 flex-shrink-0 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
            )}
            <input
              type="text"
              placeholder="Search for a company (e.g. Apple, MSFT)"
              className="w-full h-14 bg-transparent outline-none px-3 text-base text-gray-800 placeholder:text-gray-400"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsFocused(true);
              }}
              onFocus={() => setIsFocused(true)}
              disabled={isAnalyzing}
            />
          </div>

          {/* Search Results Dropdown */}
          {isFocused && query.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-lg border border-border z-50 max-h-[400px] overflow-y-auto">
              <div className="p-2">
                <CompanySearchResults
                  query={query}
                  onAnalyze={handleAnalyze}
                />
              </div>
            </div>
          )}
        </div>

        {/* Or Analyse section */}
        <div className="w-full flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 max-w-[650px]">
            <span className="text-[15px] text-[#4a4a4a] mr-2">Or analyse:</span>
            {pills.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(pill);
                  setIsFocused(true);
                }}
                className="px-3 py-1.5 bg-transparent border border-[#d1d5db] text-[#6b7280] text-[13px] rounded hover:bg-gray-50 transition-colors"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;

