import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  variant?: "default" | "white";
}

const sizeMap = {
  sm: { icon: 32, text: "text-lg", gap: "gap-2" },
  md: { icon: 36, text: "text-xl", gap: "gap-2.5" },
  lg: { icon: 40, text: "text-2xl", gap: "gap-3" },
  xl: { icon: 48, text: "text-3xl", gap: "gap-3" },
};

/** Premium SVG logo mark — abstract upward chart with leaf accent */
export const LogoMark = ({
  size = 36,
  variant = "default",
}: {
  size?: number;
  variant?: "default" | "white";
}) => {
  const primary = variant === "white" ? "var(--accent-token)" : "var(--accent-token)";
  const light = "var(--button-primary-text)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="12" fill={primary} />

      {/* Upward trend bars */}
      <rect x="10" y="30" width="6" height="8" rx="1.5" fill="rgba(255,255,255,0.45)" />
      <rect x="19" y="24" width="6" height="14" rx="1.5" fill="rgba(255,255,255,0.65)" />
      <rect x="28" y="16" width="6" height="22" rx="1.5" fill="rgba(255,255,255,0.85)" />

      {/* Peak arrow / growth indicator */}
      <path
        d="M36 14 L40 10 L40 16"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32 18 L40 10"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Small leaf accent — represents organic growth / fundamentals */}
      <path
        d="M38 32 C38 28 42 26 42 26 C42 26 40 30 38 32 Z"
        fill={light}
        opacity="0.7"
      />
    </svg>
  );
};

/** Full brand lockup — SVG icon + "FundaKaMental" wordmark */
const Logo = ({
  size = "md",
  showText = true,
  className,
  variant = "default",
}: LogoProps) => {
  const s = sizeMap[size];
  const textColor = variant === "white" ? "text-[var(--text-primary-token)]" : "text-foreground";
  const accentColor = variant === "white" ? "text-[var(--accent-token)]" : "text-primary";

  return (
    <span className={cn("flex items-center", s.gap, className)}>
      <LogoMark size={s.icon} variant={variant} />
      {showText && (
        <span className={cn("font-bold tracking-tight leading-none", s.text, textColor)}>
          Funda
          <span className={cn(accentColor)}>Ka</span>
          Mental
        </span>
      )}
    </span>
  );
};

export default Logo;
