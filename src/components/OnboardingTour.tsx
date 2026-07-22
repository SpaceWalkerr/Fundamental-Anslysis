import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";

/**
 * Premium spotlight onboarding tour for first-time users.
 *
 * Auto-starts once on the dashboard (remembered in localStorage). Highlights a
 * real element per step (by [data-tour] attribute) with a dark scrim + glowing
 * ring, and shows a dark-navy tooltip card matching the Xtin theme. Fully
 * skippable, keyboard-navigable, and re-launchable via the "?" help control.
 */

const TOUR_DONE_KEY = "fk_tour_v1_done";

interface Step {
  target?: string; // data-tour value; omitted => centered modal
  eyebrow: string;
  title: string;
  desc: string;
  badge?: string;
  placement?: "top" | "bottom" | "left" | "right";
  next?: string;
}

const STEPS: Step[] = [
  {
    eyebrow: "Welcome to FundaKaMental",
    badge: "✦",
    title: "Your personal equity research desk",
    desc: "In under a minute you'll see how to turn any company — or any annual report — into a deep, AI-written research report. No finance degree required.",
    next: "Show me around",
  },
  {
    target: "search-company",
    eyebrow: "Step 1 · Analyse instantly",
    title: "Search any listed company",
    desc: "Type a name or ticker — Apple, TCS, NVIDIA — and Gini pulls the fundamentals and writes a full analysis for you in seconds.",
    placement: "bottom",
  },
  {
    target: "upload-report",
    eyebrow: "Step 2 · Or bring your own",
    title: "Upload a report to go deeper",
    desc: "Drop in a PDF annual report, 10-K, or an Excel/CSV. The AI reads the actual filing and grounds every insight in your document.",
    placement: "bottom",
  },
  {
    target: "sidebar-nav",
    eyebrow: "Your toolkit",
    title: "Everything lives in one sidebar",
    desc: "Move between New Analysis, Portfolio, Watchlist and History anytime. The gold PRO items are the power tools serious investors use.",
    placement: "right",
  },
  {
    target: "nav-premium",
    eyebrow: "The Pro edge",
    title: "The Stock Scanner finds winners for you",
    desc: "Screen thousands of stocks by 50+ fundamentals in one query — P/E, ROE, margins, growth. It's the difference between reacting and being early.",
    placement: "right",
  },
  {
    target: "upgrade-card",
    eyebrow: "Start free, forever",
    title: "You're on the Free plan — genuinely useful",
    desc: "5 full AI reports every month, your watchlist, and portfolio basics cost nothing. Upgrade only when you want unlimited research and the Pro tools.",
    placement: "right",
    next: "Start researching",
  },
];

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_DONE_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === "true";
  } catch {
    return false;
  }
}

// Simple event bus so a help button anywhere can (re)start the tour.
export function startTour() {
  window.dispatchEvent(new CustomEvent("fk:start-tour"));
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number; centered: boolean }>({
    top: 0,
    left: 0,
    centered: true,
  });

  const step = STEPS[index];

  const finish = useCallback(
    (skipped: boolean) => {
      setActive(false);
      markTourSeen();
      void skipped;
    },
    []
  );

  const measure = useCallback(() => {
    const s = STEPS[index];
    if (!s?.target) {
      setRect(null);
      setCardPos({ top: 0, left: 0, centered: true });
      return;
    }
    const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null;
    if (!el) {
      setRect(null);
      setCardPos({ top: 0, left: 0, centered: true });
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    const box: Rect = {
      top: Math.max(6, r.top - pad),
      left: Math.max(6, r.left - pad),
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
    setRect(box);

    // Card placement
    const cw = Math.min(380, window.innerWidth - 32);
    const ch = cardRef.current?.offsetHeight || 240;
    const gap = 16;
    const placement = s.placement || "bottom";
    let top = box.top;
    let left = box.left;
    let centered = false;

    if (placement === "bottom" && box.top + box.height + gap + ch < window.innerHeight - 8) {
      top = box.top + box.height + gap;
      left = Math.min(Math.max(8, box.left), window.innerWidth - cw - 8);
    } else if (placement === "right" && box.left + box.width + gap + cw < window.innerWidth - 8) {
      top = Math.min(Math.max(8, box.top), window.innerHeight - ch - 8);
      left = box.left + box.width + gap;
    } else if (placement === "top" && box.top - gap - ch > 8) {
      top = box.top - gap - ch;
      left = Math.min(Math.max(8, box.left), window.innerWidth - cw - 8);
    } else if (box.top + box.height + gap + ch < window.innerHeight - 8) {
      top = box.top + box.height + gap;
      left = Math.min(Math.max(8, box.left), window.innerWidth - cw - 8);
    } else {
      centered = true;
    }
    setCardPos({ top, left, centered });
  }, [index]);

  useLayoutEffect(() => {
    if (!active) return;
    const el = step?.target
      ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null)
      : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(measure, el ? 380 : 0);
    return () => clearTimeout(t);
  }, [active, index, measure, step]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, measure]);

  useEffect(() => {
    const onStart = () => {
      setIndex(0);
      setActive(true);
    };
    window.addEventListener("fk:start-tour", onStart);
    // Auto-start once for first-time users.
    if (!hasSeenTour()) {
      const t = setTimeout(() => {
        setIndex(0);
        setActive(true);
      }, 900);
      return () => {
        clearTimeout(t);
        window.removeEventListener("fk:start-tour", onStart);
      };
    }
    return () => window.removeEventListener("fk:start-tour", onStart);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const total = STEPS.length;
  const pct = Math.round(((index + 1) / total) * 100);
  const isLast = index === total - 1;

  return (
    <div className="fixed inset-0 z-[10080]" aria-live="polite">
      {/* Scrim + spotlight */}
      {rect && !cardPos.centered ? (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(8,16,28,0.78)",
            outline: "2px solid rgba(74,222,128,0.85)",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#08101C]/85" />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className="absolute w-[min(380px,calc(100vw-32px))] rounded-2xl p-6 text-white shadow-2xl transition-all duration-300"
        style={
          cardPos.centered
            ? { top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "linear-gradient(150deg,#102342,#0E1B2E)", border: "1px solid rgba(74,222,128,0.25)" }
            : { top: cardPos.top, left: cardPos.left, background: "linear-gradient(150deg,#102342,#0E1B2E)", border: "1px solid rgba(74,222,128,0.25)" }
        }
      >
        {step.badge && (
          <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-xl mb-3">
            {step.badge}
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
          <Sparkles className="w-3 h-3" /> {step.eyebrow}
        </div>
        <h3 className="text-lg font-bold leading-snug mb-1.5">{step.title}</h3>
        <p className="text-sm text-white/70 leading-relaxed mb-4">{step.desc}</p>

        {/* Progress */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-white/50">{index + 1} of {total}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => finish(true)} className="mr-auto text-xs font-semibold text-white/50 hover:text-white/90 transition-colors">
            Skip tour
          </button>
          {index > 0 && (
            <button
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              className="px-3.5 py-2 rounded-lg text-sm font-bold bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => (isLast ? finish(false) : setIndex((i) => Math.min(i + 1, total - 1)))}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/30 hover:brightness-110 transition-all"
          >
            {step.next || (isLast ? "Finish" : "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
