/**
 * Premium SVG illustrations for FundaKaMental
 * Used across empty states, hero sections, auth pages, etc.
 */

import { cn } from "@/lib/utils";

interface IllustrationProps {
  className?: string;
  size?: number;
}

/** Growing chart illustration — for hero / dashboard empty state */
export const GrowthChartIllustration = ({ className, size = 280 }: IllustrationProps) => (
  <svg
    width={size}
    height={size * 0.75}
    viewBox="0 0 400 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    {/* Background card */}
    <rect x="20" y="20" width="360" height="260" rx="20" fill="white" stroke="hsl(152, 40%, 90%)" strokeWidth="1.5" />

    {/* Grid lines */}
    <line x1="60" y1="80" x2="340" y2="80" stroke="hsl(152, 20%, 92%)" strokeWidth="1" />
    <line x1="60" y1="130" x2="340" y2="130" stroke="hsl(152, 20%, 92%)" strokeWidth="1" />
    <line x1="60" y1="180" x2="340" y2="180" stroke="hsl(152, 20%, 92%)" strokeWidth="1" />
    <line x1="60" y1="230" x2="340" y2="230" stroke="hsl(152, 20%, 92%)" strokeWidth="1" />

    {/* Area fill under chart */}
    <path
      d="M60 230 L100 200 L150 210 L200 160 L250 140 L300 100 L340 70 L340 230 Z"
      fill="url(#growthGrad)"
      opacity="0.3"
    />

    {/* Chart line */}
    <path
      d="M60 230 L100 200 L150 210 L200 160 L250 140 L300 100 L340 70"
      stroke="hsl(152, 69%, 31%)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* Data points */}
    <circle cx="100" cy="200" r="5" fill="white" stroke="hsl(152, 69%, 31%)" strokeWidth="2.5" />
    <circle cx="200" cy="160" r="5" fill="white" stroke="hsl(152, 69%, 31%)" strokeWidth="2.5" />
    <circle cx="300" cy="100" r="5" fill="white" stroke="hsl(152, 69%, 31%)" strokeWidth="2.5" />
    <circle cx="340" cy="70" r="6" fill="hsl(152, 69%, 31%)" stroke="white" strokeWidth="2.5" />

    {/* Tooltip on latest point */}
    <rect x="300" y="38" width="60" height="24" rx="6" fill="hsl(152, 69%, 31%)" />
    <text x="330" y="55" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
      +24.3%
    </text>

    {/* Y-axis labels */}
    <text x="48" y="84" textAnchor="end" fill="hsl(152, 20%, 65%)" fontSize="10">400</text>
    <text x="48" y="134" textAnchor="end" fill="hsl(152, 20%, 65%)" fontSize="10">300</text>
    <text x="48" y="184" textAnchor="end" fill="hsl(152, 20%, 65%)" fontSize="10">200</text>
    <text x="48" y="234" textAnchor="end" fill="hsl(152, 20%, 65%)" fontSize="10">100</text>

    <defs>
      <linearGradient id="growthGrad" x1="200" y1="70" x2="200" y2="230" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(152, 69%, 31%)" stopOpacity="0.4" />
        <stop offset="1" stopColor="hsl(152, 69%, 31%)" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

/** Document analysis illustration — for NewAnalysis / upload states */
export const AnalysisIllustration = ({ className, size = 240 }: IllustrationProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 300 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    {/* Document shape */}
    <rect x="70" y="30" width="160" height="200" rx="12" fill="white" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />

    {/* Document fold */}
    <path d="M190 30 L230 70" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />
    <path d="M190 30 L190 70 L230 70" fill="hsl(152, 40%, 95%)" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />

    {/* Text lines */}
    <rect x="95" y="90" width="100" height="6" rx="3" fill="hsl(152, 30%, 88%)" />
    <rect x="95" y="106" width="80" height="6" rx="3" fill="hsl(152, 30%, 88%)" />
    <rect x="95" y="122" width="110" height="6" rx="3" fill="hsl(152, 30%, 88%)" />
    <rect x="95" y="138" width="70" height="6" rx="3" fill="hsl(152, 30%, 88%)" />

    {/* Highlight bar */}
    <rect x="90" y="160" width="120" height="28" rx="8" fill="hsl(152, 69%, 31%)" opacity="0.1" />
    <rect x="100" y="170" width="60" height="8" rx="4" fill="hsl(152, 69%, 31%)" opacity="0.6" />

    {/* Magnifying glass */}
    <circle cx="220" cy="200" r="36" fill="hsl(152, 40%, 95%)" stroke="hsl(152, 69%, 31%)" strokeWidth="3" />
    <line x1="246" y1="226" x2="268" y2="248" stroke="hsl(152, 69%, 31%)" strokeWidth="4" strokeLinecap="round" />

    {/* Check marks inside magnifier */}
    <path d="M205 196 L214 205 L236 188" stroke="hsl(152, 69%, 31%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* Sparkle accents */}
    <circle cx="58" cy="60" r="4" fill="hsl(152, 69%, 31%)" opacity="0.2" />
    <circle cx="248" cy="44" r="3" fill="hsl(152, 69%, 31%)" opacity="0.15" />
    <circle cx="52" cy="180" r="5" fill="hsl(152, 69%, 31%)" opacity="0.1" />
  </svg>
);

/** Portfolio / briefcase illustration */
export const PortfolioIllustration = ({ className, size = 240 }: IllustrationProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 300 300"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    {/* Briefcase body */}
    <rect x="50" y="100" width="200" height="140" rx="16" fill="white" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />

    {/* Briefcase handle */}
    <path d="M120 100 V80 A16 16 0 0 1 136 64 H164 A16 16 0 0 1 180 80 V100" fill="none" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />

    {/* Center clasp */}
    <rect x="135" y="150" width="30" height="20" rx="6" fill="hsl(152, 69%, 31%)" />
    <circle cx="150" cy="160" r="4" fill="white" />

    {/* Mini chart bars inside */}
    <rect x="80" y="200" width="16" height="20" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.2" />
    <rect x="104" y="190" width="16" height="30" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.35" />
    <rect x="128" y="185" width="16" height="35" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.5" />
    <rect x="152" y="178" width="16" height="42" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.65" />
    <rect x="176" y="172" width="16" height="48" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.8" />
    <rect x="200" y="164" width="16" height="56" rx="3" fill="hsl(152, 69%, 31%)" />

    {/* Coins */}
    <ellipse cx="260" cy="230" rx="22" ry="8" fill="hsl(44, 80%, 70%)" opacity="0.5" />
    <ellipse cx="260" cy="222" rx="22" ry="8" fill="hsl(44, 80%, 65%)" opacity="0.7" />
    <ellipse cx="260" cy="214" rx="22" ry="8" fill="hsl(44, 80%, 60%)" />
    <text x="260" y="218" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">$</text>

    {/* Sparkle */}
    <path d="M60 70 L64 60 L68 70 L78 74 L68 78 L64 88 L60 78 L50 74 Z" fill="hsl(152, 69%, 31%)" opacity="0.2" />
  </svg>
);

/** Empty state / no data illustration */
export const EmptyStateIllustration = ({ className, size = 200 }: IllustrationProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    {/* Circle backdrop */}
    <circle cx="120" cy="120" r="100" fill="hsl(152, 40%, 96%)" />

    {/* Folder bottom */}
    <rect x="55" y="100" width="130" height="80" rx="10" fill="white" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />

    {/* Folder tab */}
    <path d="M55 100 V90 A8 8 0 0 1 63 82 H100 L110 95 H55" fill="white" stroke="hsl(152, 40%, 85%)" strokeWidth="1.5" />

    {/* Search icon */}
    <circle cx="120" cy="140" r="16" fill="none" stroke="hsl(152, 69%, 31%)" strokeWidth="2" opacity="0.5" />
    <line x1="131" y1="151" x2="140" y2="160" stroke="hsl(152, 69%, 31%)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

    {/* Plus sign — ready to add */}
    <circle cx="175" cy="85" r="14" fill="hsl(152, 69%, 31%)" opacity="0.15" />
    <line x1="175" y1="79" x2="175" y2="91" stroke="hsl(152, 69%, 31%)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    <line x1="169" y1="85" x2="181" y2="85" stroke="hsl(152, 69%, 31%)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

    {/* Decorative dots */}
    <circle cx="60" cy="70" r="3" fill="hsl(152, 69%, 31%)" opacity="0.15" />
    <circle cx="185" cy="185" r="4" fill="hsl(152, 69%, 31%)" opacity="0.1" />
    <circle cx="45" cy="155" r="2.5" fill="hsl(152, 69%, 31%)" opacity="0.12" />
  </svg>
);

/** Shield / security illustration — for auth pages */
export const SecurityIllustration = ({ className, size = 260 }: IllustrationProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 320 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    {/* Radial glow */}
    <circle cx="160" cy="160" r="140" fill="url(#shieldGlow)" />

    {/* Shield shape */}
    <path
      d="M160 40 L260 80 V170 C260 230 210 280 160 296 C110 280 60 230 60 170 V80 Z"
      fill="white"
      stroke="hsl(152, 69%, 31%)"
      strokeWidth="2"
    />

    {/* Inner shield */}
    <path
      d="M160 68 L236 100 V168 C236 218 196 258 160 270 C124 258 84 218 84 168 V100 Z"
      fill="hsl(152, 40%, 96%)"
    />

    {/* Checkmark */}
    <path
      d="M128 160 L150 182 L196 136"
      stroke="hsl(152, 69%, 31%)"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/* Chart accent inside shield */}
    <rect x="120" y="200" width="10" height="20" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.2" />
    <rect x="138" y="192" width="10" height="28" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.3" />
    <rect x="156" y="184" width="10" height="36" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.4" />
    <rect x="174" y="196" width="10" height="24" rx="3" fill="hsl(152, 69%, 31%)" opacity="0.25" />

    {/* Floating dots */}
    <circle cx="46" cy="100" r="5" fill="hsl(152, 69%, 31%)" opacity="0.15" />
    <circle cx="280" cy="120" r="4" fill="hsl(152, 69%, 31%)" opacity="0.12" />
    <circle cx="60" cy="240" r="6" fill="hsl(152, 69%, 31%)" opacity="0.08" />
    <circle cx="270" cy="230" r="3" fill="hsl(152, 69%, 31%)" opacity="0.1" />

    <defs>
      <radialGradient id="shieldGlow" cx="160" cy="160" r="140" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(152, 69%, 31%)" stopOpacity="0.06" />
        <stop offset="1" stopColor="hsl(152, 69%, 31%)" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

/** Watchlist / eye illustration */
export const WatchlistIllustration = ({ className, size = 200 }: IllustrationProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    <circle cx="120" cy="120" r="100" fill="hsl(152, 40%, 96%)" />

    {/* Eye shape */}
    <path
      d="M40 120 C40 120 80 70 120 70 C160 70 200 120 200 120 C200 120 160 170 120 170 C80 170 40 120 40 120 Z"
      fill="white"
      stroke="hsl(152, 69%, 31%)"
      strokeWidth="2"
    />

    {/* Iris */}
    <circle cx="120" cy="120" r="28" fill="hsl(152, 40%, 90%)" stroke="hsl(152, 69%, 31%)" strokeWidth="2" />
    <circle cx="120" cy="120" r="14" fill="hsl(152, 69%, 31%)" />
    <circle cx="113" cy="113" r="4" fill="white" opacity="0.8" />

    {/* Trend line through eye */}
    <path d="M50 140 L90 130 L120 110 L150 100 L190 80" stroke="hsl(152, 69%, 31%)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" fill="none" />

    {/* Star / bookmark accent */}
    <path d="M195 60 L198 68 L207 69 L201 75 L202 84 L195 80 L188 84 L189 75 L183 69 L192 68 Z" fill="hsl(44, 80%, 60%)" opacity="0.6" />
  </svg>
);
