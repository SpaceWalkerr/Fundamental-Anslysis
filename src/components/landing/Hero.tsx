import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import CompanySearchResults from "@/components/CompanySearchResults";
import Logo from "@/components/brand/Logo";

const Hero = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleAnalyze = (company: any) => {
    // Navigate to a mock analysis report for now
    navigate(`/dashboard/report/1`);
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
    "Apple", "Microsoft", "NVIDIA",
    "Alphabet", "Amazon", "Tesla"
  ];

  return (
    <section className="min-h-[92vh] flex flex-col items-center justify-center bg-[#F2F6F9] pt-24 pb-16 px-4">
      <div className="w-full max-w-[700px] flex flex-col items-center">

        {/* Trust eyebrow */}
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[12px] font-semibold tracking-wide text-primary uppercase">
            AI-Powered Equity Research
          </span>
        </div>

        {/* App Logo */}
        <div className="flex items-center justify-center mb-6">
          <Logo size="xl" />
        </div>

        {/* Subtitle */}
        <p className="text-[17px] text-[#4a4a4a] mb-10 text-center max-w-[560px]">
          Institutional-grade fundamental analysis for everyone. Search any company and
          get a deep, AI-written research report in seconds — free to start.
        </p>

        {/* Search Bar Container */}
        <div className="w-full relative mb-8" ref={searchRef}>
          <div className={`flex items-center w-full bg-white rounded-md border ${isFocused ? "border-primary shadow-md ring-1 ring-primary/20" : "border-gray-200"} transition-all duration-200`}>
            <Search className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
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
                className="px-3 py-1.5 bg-transparent border border-[#d1d5db] text-[#6b7280] text-[13px] rounded hover:border-primary hover:text-primary transition-colors"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[#6b7280]">
          <span className="flex items-center gap-1.5">
            <span className="text-primary font-bold">✓</span> No credit card to start
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-primary font-bold">✓</span> 5 free reports / month
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-primary font-bold">✓</span> Global &amp; Indian markets
          </span>
        </div>

      </div>

      {/* Scroll cue */}
      <a
        href="/#features"
        aria-label="See how it works"
        className="mt-12 flex flex-col items-center gap-1 text-[#9ca3af] hover:text-primary transition-colors animate-bounce"
      >
        <span className="text-[11px] font-medium uppercase tracking-wider">See how it works</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </a>
    </section>
  );
};

export default Hero;

