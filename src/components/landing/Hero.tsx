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
    <section className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 pt-28 text-[var(--text-primary-token)]">
      <div className="w-full max-w-[860px] flex flex-col items-center">
        
        {/* App Logo */}
        <div className="flex items-center justify-center mb-6">
          <Logo size="xl" variant="white" />
        </div>

        {/* Subtitle */}
        <p className="mb-10 text-center text-[15px] uppercase tracking-[0.12em] text-[var(--text-muted-token)]">
          Institutional-Grade Fundamental Analysis for Everyone.
        </p>

        {/* Search Bar Container */}
        <div className="w-full relative mb-8" ref={searchRef}>
          <div className={`flex w-full items-center rounded-lg border bg-[var(--bg-surface)] ${isFocused ? "border-[var(--accent-token)] shadow-[var(--shadow-glow)]" : "border-[var(--border-token)]"}`}>
            <Search className="ml-4 h-5 w-5 flex-shrink-0 text-[var(--accent-token)]" />
            <input
              type="text"
              placeholder="Search for a company (e.g. Apple, MSFT)"
              className="h-16 w-full bg-transparent px-3 font-market text-base text-[var(--text-primary-token)] outline-none placeholder:text-[var(--text-muted-token)]"
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
            <div className="app-shell absolute left-0 right-0 top-full z-50 mt-2 max-h-[430px] overflow-y-auto rounded-lg border border-[var(--border-token)] bg-[var(--bg-surface)] shadow-2xl">
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
            <span className="mr-2 text-[13px] uppercase tracking-[0.12em] text-[var(--text-muted-token)]">Or analyse:</span>
            {pills.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(pill);
                  setIsFocused(true);
                }}
                className="rounded border border-[var(--border-token)] bg-transparent px-3 py-1.5 text-[12px] text-[var(--text-muted-token)] hover:border-[var(--accent-token)] hover:text-[var(--text-primary-token)]"
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
