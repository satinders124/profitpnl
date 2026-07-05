"use client";

/* =====================================================================
   ProfitPnL — Landing Page (ALL components in ONE file)
   Drop this into: app/page.tsx
   Requires: npm install framer-motion
   Requires: the updated globals.css (with @theme block + animations)
   ===================================================================== */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
} from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Turnstile } from "@/components/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";


/* =====================================================================
   1. NAVBAR
   ===================================================================== */

const navLinks = [
  { label: "Tools", href: "/tools" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const REMEMBERED_EMAIL_KEY = "ppnl_remembered_email";

function LoginDropdown({
  align = "right",
  onLoggedIn,
}: {
  align?: "left" | "right";
  onLoggedIn?: () => void;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // localStorage unavailable — ignore.
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the verification below.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: TURNSTILE_SITE_KEY && captchaToken ? { captchaToken } : undefined,
      });

      if (authError || !data.user) {
        // Show the actual Supabase error message for clarity
        const msg = authError?.message || "Login failed. Please try again.";
        setError(msg);
        setLoading(false);
        return;
      }

      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // localStorage unavailable — non-critical, ignore.
      }

      onLoggedIn?.();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="text-sm font-semibold text-muted2 transition-colors hover:text-gold"
      >
        Login
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-[calc(100%+14px)] z-50 w-72 rounded-2xl border border-line bg-panel/95 p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <p className="mb-3 text-sm font-bold text-txt">Welcome back</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-line bg-ink2 px-3 py-2.5 text-sm text-txt outline-none focus:border-gold"
              />

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-line bg-ink2 px-3 py-2.5 pr-14 text-sm text-txt outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gold"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    rememberMe ? "border-gold bg-gold" : "border-line bg-ink2"
                  }`}
                >
                  {rememberMe && (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-2.5 w-2.5 text-ink"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8.5l3 3 7-7" />
                    </svg>
                  )}
                </span>
                <span className="text-xs text-dim">Remember me</span>
              </label>

              {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center py-1">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onVerify={(token) => { setCaptchaToken(token); setError(""); }}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                    theme="dark"
                  />
                </div>
              )}

              {error && <p className="text-xs text-bear">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="gold-gradient w-full rounded-lg py-2.5 text-sm font-bold text-ink disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-dim">
              No account?{" "}
              <a href="/register" className="font-bold text-gold">
                Create one free
              </a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  // The mobile menu panel needs overflow-hidden ONLY while its height is
  // animating (0 -> auto), so the slide-down looks clean. Once it's fully
  // open we switch to overflow-visible so the absolutely-positioned Login
  // dropdown inside it can render outside the panel's bounds instead of
  // being clipped — that clipping was the "form hides on mobile" bug.
  const [menuFullyOpen, setMenuFullyOpen] = useState(false);

  function toggleMenu() {
    // Always re-clip first, whether we're about to open or close, so the
    // height animation itself (in either direction) is never left visible.
    setMenuFullyOpen(false);
    setOpen((v) => !v);
  }

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-ink/70 backdrop-blur-xl"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#" className="group flex items-center gap-2">
          <img
            src="/logo.png"
            alt="ProfitPnL"
            className="h-9 w-auto transition-transform duration-300 group-hover:scale-105"
          />
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.label}
              href={link.href}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className="relative text-sm text-muted2 transition-colors hover:text-gold after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </motion.a>
          ))}
          <LoginDropdown align="right" />
          <motion.a
            href="#cta"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.65, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink shadow-[0_0_24px_rgba(240,180,41,0.4)] transition-shadow hover:shadow-[0_0_40px_rgba(240,180,41,0.65)]"
          >
            Get Started Free
          </motion.a>
        </div>

        {/* mobile hamburger */}
        <button
          aria-label="Menu"
          onClick={toggleMenu}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <motion.span animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }} className="h-0.5 w-6 bg-txt" />
          <motion.span animate={open ? { opacity: 0 } : { opacity: 1 }} className="h-0.5 w-6 bg-txt" />
          <motion.span animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }} className="h-0.5 w-6 bg-txt" />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            onAnimationComplete={(definition) => {
              // Only stop clipping once the OPEN animation (the "animate"
              // prop, i.e. height: "auto") has actually finished — not on
              // the initial/exit keyframes, which pass different objects.
              if (definition && (definition as { height?: string }).height === "auto") {
                setMenuFullyOpen(true);
              }
            }}
            className={`border-t border-line/60 bg-ink/95 backdrop-blur-xl md:hidden ${
              menuFullyOpen ? "overflow-visible" : "overflow-hidden"
            }`}
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ x: -24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-txt transition-colors hover:bg-panel hover:text-gold"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: navLinks.length * 0.06 }}
                className="mt-1 border-t border-line/60 pt-3"
              >
                <LoginDropdown align="left" onLoggedIn={() => setOpen(false)} />
              </motion.div>
              <motion.a
                href="#cta"
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.32 }}
                onClick={() => setOpen(false)}
                className="gold-gradient mt-2 rounded-lg px-3 py-3 text-center font-bold text-ink"
              >
                Get Started Free
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* =====================================================================
   2. TICKER TAPE — journaled trades marquee
   ===================================================================== */

type TickerEntry = { setup: string; sym: string; dir: "LONG" | "SHORT"; r: number; emo: string };

const TICKER_ENTRIES: TickerEntry[] = [
  { setup: "ORB Breakout", sym: "NQ", dir: "LONG", r: 2.4, emo: "🎯 Disciplined" },
  { setup: "FVG Retest", sym: "XAUUSD", dir: "SHORT", r: 1.8, emo: "😌 Calm" },
  { setup: "Trend Pullback", sym: "EURUSD", dir: "LONG", r: -1.0, emo: "😤 FOMO flagged" },
  { setup: "Liquidity Sweep", sym: "BTCUSD", dir: "SHORT", r: 3.1, emo: "🎯 A+ Setup" },
  { setup: "VWAP Bounce", sym: "ES", dir: "LONG", r: 0.9, emo: "😌 Patient" },
  { setup: "Range Fade", sym: "GBPJPY", dir: "SHORT", r: -0.5, emo: "⚠️ Revenge risk" },
  { setup: "NY Open Drive", sym: "NQ", dir: "LONG", r: 2.0, emo: "🎯 Followed plan" },
  { setup: "Supply Zone", sym: "US30", dir: "SHORT", r: 1.2, emo: "😌 Calm" },
  { setup: "Breaker Block", sym: "XAUUSD", dir: "LONG", r: 2.7, emo: "🎯 A+ Setup" },
  { setup: "London ORB", sym: "DAX", dir: "LONG", r: 1.5, emo: "😌 Disciplined" },
];

function TickerTape() {
  const row = [...TICKER_ENTRIES, ...TICKER_ENTRIES];

  return (
    <div className="marquee-paused relative z-20 w-full overflow-hidden border-y border-line bg-panel/80 backdrop-blur">
      <div className="animate-marquee flex w-max items-center gap-8 px-4 py-2">
        {row.map((t, i) => (
          <div key={i} className="flex items-center gap-2 font-mono2 text-xs whitespace-nowrap">
            <span className="text-dim">JOURNALED ›</span>
            <span className={`font-bold ${t.dir === "LONG" ? "text-bull" : "text-bear"}`}>{t.dir}</span>
            <span className="text-txt">{t.sym}</span>
            <span className="text-muted2">· {t.setup} ·</span>
            <span className={t.r >= 0 ? "text-bull" : "text-bear"}>
              {t.r >= 0 ? "+" : ""}{t.r.toFixed(1)}R
            </span>
            <span className="text-gold/80">{t.emo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
   3. DASHBOARD MOCKUP — realistic equity curve
   ===================================================================== */

// deterministic PRNG so the curve is identical on server & client (no hydration mismatch)
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// realistic equity curve: ~60% win rate, streaks + a real drawdown phase
function buildEquity(): number[] {
  const rnd = mulberry32(42);
  const eq: number[] = [0];
  let cum = 0;
  for (let i = 0; i < 58; i++) {
    const inDD = i >= 22 && i < 31;
    const winP = inDD ? 0.32 : 0.62;
    const win = rnd() < winP;
    const r = win ? 0.6 + rnd() * 2.2 : -(0.4 + rnd() * 1.0);
    const val = rnd() < 0.12 ? (rnd() - 0.5) * 0.3 : r;
    cum += val;
    eq.push(+cum.toFixed(2));
  }
  return eq;
}

const EQUITY = buildEquity();
const FINAL_R = EQUITY[EQUITY.length - 1];
const PEAKS = EQUITY.map((_, i) => Math.max(...EQUITY.slice(0, i + 1)));

const R_BARS = [1.8, -0.9, 2.4, 1.1, -0.5, 3.2, 0.8, -1.0, 2.1, 1.6];
const HEAT = [
  0.6, 0.2, -0.3, 0.8, 0, 0.4, 0.9,
  -0.2, 0.7, 0.3, 0, 0.5, -0.6, 0.8,
  0.4, 0.9, -0.1, 0.6, 0.2, 0, 0.7,
];

function heatColor(v: number) {
  if (v === 0) return "bg-line/60";
  if (v > 0.6) return "bg-bull shadow-[0_0_8px_rgba(0,208,132,0.6)]";
  if (v > 0) return "bg-bull/40";
  if (v < -0.4) return "bg-bear/80";
  return "bg-bear/40";
}

function DashboardMockup() {
  const [pnl, setPnl] = useState(FINAL_R);
  const [wins, setWins] = useState(22);
  const pnlRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const r = +(Math.random() * 2.4 - 0.8).toFixed(2);
      setPnl((p) => +(p + r).toFixed(2));
      if (r > 0) setWins((w) => w + 1);
      const el = pnlRef.current;
      if (el) {
        el.classList.remove("blink-up");
        void el.offsetWidth;
        el.classList.add("blink-up");
      }
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const W = 300;
  const H = 100;
  const PAD = 6;
  const min = Math.min(...EQUITY, 0);
  const max = Math.max(...EQUITY);
  const span = max - min || 1;
  const x = (i: number) => (i / (EQUITY.length - 1)) * W;
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const pts = EQUITY.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const peakPts = PEAKS.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const zeroY = y(0);
  const lastX = x(EQUITY.length - 1);
  const lastY = y(FINAL_R);

  // max drawdown marker
  let ddIdx = 0, ddDepth = 0;
  EQUITY.forEach((v, i) => {
    const d = PEAKS[i] - v;
    if (d > ddDepth) { ddDepth = d; ddIdx = i; }
  });

  const winRate = Math.min(99, Math.round((wins / (wins + 13)) * 100));
  const circ = 2 * Math.PI * 26;

  return (
    <div className="border-spin relative overflow-hidden rounded-2xl shadow-[0_0_80px_-20px_rgba(240,180,41,0.35)]">
      <div className="relative rounded-2xl bg-panel/95 p-4 sm:p-5">
        {/* window header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-bear/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-bull/80" />
            </div>
            <span className="ml-2 font-mono2 text-[11px] text-muted2">ProfitPnL Dashboard</span>
          </div>
          <span className="rounded-full border border-bull/30 bg-bull/10 px-2.5 py-0.5 font-mono2 text-[10px] font-bold text-bull">
            ▲ +{pnl.toFixed(1)}R this month
          </span>
        </div>

        {/* top stats row */}
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-line bg-ink2/80 p-3">
            <p className="text-[9px] tracking-wider text-dim uppercase">Win Rate</p>
            <div className="mt-1 flex items-center gap-2">
              <svg viewBox="0 0 60 60" className="h-10 w-10 -rotate-90">
                <circle cx="30" cy="30" r="26" fill="none" stroke="#1e1e38" strokeWidth="6" />
                <motion.circle
                  cx="30" cy="30" r="26" fill="none" stroke="#f0b429" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  whileInView={{ strokeDashoffset: circ * (1 - winRate / 100) }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: "easeOut", delay: 0.4 }}
                />
              </svg>
              <div>
                <p className="font-mono2 text-sm font-bold text-gold">{winRate}%</p>
                <p className="font-mono2 text-[9px] text-dim">{wins}W / 13L</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-ink2/80 p-3">
            <p className="text-[9px] tracking-wider text-dim uppercase">Total P&L</p>
            <p className="mt-1.5 font-mono2 text-base font-bold text-bull">
              <span ref={pnlRef}>+{pnl.toFixed(2)}R</span>
            </p>
            <p className="font-mono2 text-[9px] text-dim">{wins + 13} trades</p>
          </div>
          <div className="rounded-xl border border-line bg-ink2/80 p-3">
            <p className="text-[9px] tracking-wider text-dim uppercase">Avg Winner</p>
            <p className="mt-1.5 font-mono2 text-base font-bold text-txt">1.6R</p>
            <p className="font-mono2 text-[9px] text-dim">expectancy +0.53</p>
          </div>
        </div>

        {/* realistic equity curve */}
        <div className="relative mb-4 rounded-xl border border-line bg-ink2/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] tracking-wider text-dim uppercase">Equity Curve · R-multiples</p>
            <div className="flex items-center gap-3 font-mono2 text-[9px]">
              <span className="text-gold">— equity</span>
              <span className="text-dim">--- peak</span>
              <span className="text-bear/80">▼ max DD -{ddDepth.toFixed(1)}R</span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 overflow-hidden rounded-xl">
            <div className="animate-scan h-full w-full bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0b429" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff4565" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ff4565" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((p) => (
              <line key={p} x1="0" x2={W} y1={H * p} y2={H * p} stroke="#1e1e38" strokeWidth="1" strokeDasharray="4 6" />
            ))}

            <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="#5a5a80" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />

            {/* drawdown band between running peak and equity */}
            <motion.polygon
              points={`${peakPts} ${[...EQUITY].map((_, i) => `${x(EQUITY.length - 1 - i).toFixed(1)},${y(EQUITY[EQUITY.length - 1 - i]).toFixed(1)}`).join(" ")}`}
              fill="url(#ddFill)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 1.6 }}
            />

            {/* area under equity */}
            <motion.polygon
              points={`0,${zeroY} ${pts} ${W},${zeroY}`}
              fill="url(#eqFill)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 1.2 }}
            />

            {/* running-peak dashed line */}
            <motion.polyline
              points={peakPts}
              fill="none"
              stroke="#5a5a80"
              strokeWidth="1"
              strokeDasharray="3 4"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.7 }}
              viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
            />

            {/* jagged equity line */}
            <motion.polyline
              points={pts}
              fill="none"
              stroke="#f0b429"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2.4, ease: "easeInOut", delay: 0.3 }}
            />

            {/* max drawdown marker */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 2, type: "spring", stiffness: 300 }}
            >
              <circle cx={x(ddIdx)} cy={y(EQUITY[ddIdx])} r="3.5" fill="#ff4565" />
              <circle cx={x(ddIdx)} cy={y(EQUITY[ddIdx])} r="7" fill="none" stroke="#ff4565" strokeWidth="1" opacity="0.5" />
            </motion.g>

            {/* live end dot */}
            <circle cx={lastX} cy={lastY} r="4" fill="#f0b429">
              <animate attributeName="r" values="3;6;3" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>

          <div className="mt-1 flex justify-between font-mono2 text-[8px] text-dim">
            <span>Trade 1</span>
            <span>Trade 20</span>
            <span>Trade 40</span>
            <span className="text-gold">+{FINAL_R.toFixed(1)}R</span>
          </div>
        </div>

        {/* bottom row: R bars + heatmap */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line bg-ink2/80 p-3">
            <p className="mb-2 text-[9px] tracking-wider text-dim uppercase">Last 10 Trades (R)</p>
            <div className="flex h-14 items-end justify-between gap-1">
              {R_BARS.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={`w-full origin-bottom rounded-sm ${r >= 0 ? "bg-bull/80" : "bg-bear/80"}`}
                  style={{ height: `${Math.abs(r) * 28}%`, minHeight: 4 }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-ink2/80 p-3">
            <p className="mb-2 text-[9px] tracking-wider text-dim uppercase">P&L Calendar</p>
            <div className="grid grid-cols-7 gap-1">
              {HEAT.map((v, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + i * 0.04, type: "spring", stiffness: 300, damping: 18 }}
                  className={`aspect-square rounded-[3px] ${heatColor(v)}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* AI coach strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="mt-2.5 flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/8 px-3 py-2"
        >
          <span className="text-sm">🤖</span>
          <p className="font-mono2 text-[10px] leading-tight text-muted2">
            <span className="font-bold text-gold">AI Coach:</span> You over-trade after 2 losses — pause 15 min. Your London ORB setup is +2.4R avg. Focus there.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* =====================================================================
   4. HERO
   ===================================================================== */

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const heroParticles = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 71) % 100}%`,
  delay: (i * 0.9) % 6,
  dur: 7 + (i % 5) * 2,
  size: 3 + (i % 3) * 2,
  gold: i % 3 !== 0,
}));

const heroStats = [
  { v: "50+", l: "Metrics Tracked" },
  { v: "AI", l: "Coach Built-in" },
  { v: "∞", l: "Prop Accounts" },
  { v: "100%", l: "Cloud Synced" },
];

function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* animated grid + glows */}
      <div className="trading-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />
      <div className="animate-pulse-glow absolute -top-32 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-gold/12 blur-[120px]" />
      <div className="animate-pulse-glow absolute top-40 -right-32 h-72 w-72 rounded-full bg-purple2/10 blur-[100px] [animation-delay:2s]" />
      <div className="animate-pulse-glow absolute top-64 -left-24 h-64 w-64 rounded-full bg-blue2/10 blur-[100px] [animation-delay:1s]" />

      {/* rising particles */}
      {heroParticles.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${p.gold ? "bg-gold/60" : "bg-bull/50"}`}
          style={{ left: p.left, width: p.size, height: p.size, bottom: -10 }}
          animate={{ y: [-0, -560], opacity: [0, 0.9, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8">
        <motion.div variants={heroContainer} initial="hidden" animate="show" className="text-center lg:text-left">
          <motion.div
            variants={heroItem}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold lg:mx-0"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-slow absolute h-full w-full rounded-full bg-gold" />
              <span className="relative h-2 w-2 rounded-full bg-gold" />
            </span>
            AI-Powered · Built for Prop Traders
          </motion.div>

          <motion.h1 variants={heroItem} className="text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Stop Guessing.
            <br />
            <span className="text-shimmer">Find Your Edge.</span>
          </motion.h1>

          <motion.p variants={heroItem} className="mx-auto mt-6 max-w-xl text-base text-muted2 sm:text-lg lg:mx-0">
            The professional trading journal built for serious traders. Track every trade,
            decode every pattern, and let AI tell you exactly what's holding you back.
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <motion.a
              href="#cta"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="gold-gradient group relative w-full overflow-hidden rounded-xl px-8 py-4 text-center font-bold text-ink shadow-[0_0_35px_rgba(240,180,41,0.45)] sm:w-auto"
            >
              <span className="relative z-10">Start Journaling Free →</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </motion.a>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="w-full rounded-xl border border-line bg-panel/60 px-8 py-4 text-center font-semibold text-txt backdrop-blur transition-colors hover:border-gold/50 hover:text-gold sm:w-auto"
            >
              See How It Works
            </motion.a>
          </motion.div>

          {/* hero stats strip */}
          <motion.div variants={heroItem} className="mt-10 grid grid-cols-4 gap-3 border-t border-line/60 pt-6">
            {heroStats.map((s) => (
              <div key={s.l} className="text-center lg:text-left">
                <p className="font-mono2 text-lg font-bold text-gold sm:text-2xl">{s.v}</p>
                <p className="text-[10px] tracking-wide text-dim uppercase sm:text-xs">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* right: journal dashboard mockup + floating cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-lg"
        >
          <DashboardMockup />

          <div className="animate-float absolute -top-6 left-0 sm:-left-8">
            <div className="rounded-xl border border-bull/30 bg-panel/90 px-4 py-3 shadow-[0_8px_40px_rgba(0,208,132,0.25)] backdrop-blur">
              <p className="text-[10px] tracking-wider text-dim uppercase">This month</p>
              <p className="font-mono2 text-lg font-bold text-bull">+18.4R</p>
            </div>
          </div>

          <div className="animate-float-slow absolute right-0 -bottom-6 sm:-right-8">
            <div className="rounded-xl border border-gold/30 bg-panel/90 px-4 py-3 shadow-[0_8px_40px_rgba(240,180,41,0.25)] backdrop-blur">
              <p className="text-[10px] tracking-wider text-dim uppercase">Discipline streak</p>
              <p className="font-mono2 text-lg font-bold text-gold">🔥 12 days on-plan</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   5. STATS — count-up counters
   ===================================================================== */

function Counter({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 2000, bounce: 0 });
  const text = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`);

  useEffect(() => {
    if (inView) animate(mv, to, { duration: 2, ease: "easeOut" });
  }, [inView, to, mv]);

  return <motion.span ref={ref}>{text}</motion.span>;
}

const statsData: { label: string; to: number; suffix?: string; prefix?: string; decimals?: number }[] = [
  { label: "Metrics tracked", to: 50, suffix: "+" },
  { label: "Trades journaled", to: 250000, suffix: "+" },
  { label: "Setup logging time", to: 30, suffix: "s", prefix: "<" },
  { label: "Cloud synced", to: 100, suffix: "%" },
];

function Stats() {
  return (
    <section id="stats" className="relative border-y border-line/60 bg-ink2/60 py-14 sm:py-20">
      <div className="trading-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4">
        {statsData.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="text-center"
          >
            <p className="font-mono2 text-3xl font-bold text-gold drop-shadow-[0_0_18px_rgba(240,180,41,0.5)] sm:text-4xl lg:text-5xl">
              <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals ?? 0} />
            </p>
            <p className="mt-2 text-xs tracking-wider text-muted2 uppercase sm:text-sm">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}


/* =====================================================================
   6. FREE TOOLS PREVIEW
   ===================================================================== */

const toolCards = [
  {
    icon: "📈",
    title: "Profit Calculator",
    desc: "Calculate exact forex, crypto, index, and futures P&L from entry, exit, direction, and size.",
    href: "/tools/profit-calculator",
    stat: "P&L in seconds",
  },
  {
    icon: "📐",
    title: "Lot Size Calculator",
    desc: "Size every trade from account balance, risk %, and stop-loss distance before you enter.",
    href: "/tools/lot-size-calculator",
    stat: "Risk-first sizing",
  },
  {
    icon: "🧮",
    title: "Pip Value Calculator",
    desc: "See what one pip or futures tick is worth in your account currency.",
    href: "/tools/pip-value-calculator",
    stat: "Forex + ES/NQ ticks",
  },
  {
    icon: "⚖️",
    title: "Risk-Reward Calculator",
    desc: "Check your R:R and break-even win rate before taking the setup.",
    href: "/tools/risk-reward-calculator",
    stat: "1:R + win rate",
  },
];

function ToolsPreview() {
  return (
    <section id="tools" className="relative overflow-hidden py-20 sm:py-28">
      <div className="animate-pulse-glow absolute right-[-180px] top-10 h-96 w-96 rounded-full bg-gold/8 blur-[130px]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">{"//"} Free Trading Tools</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Free calculators that bring <span className="text-shimmer">organic traders</span> to ProfitPnL
          </h2>
          <p className="mt-4 text-muted2">
            No login, no paywall. Built for the exact searches traders make before they journal: profit, lot size, pip value, tick value, and risk-reward.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {toolCards.map((tool, i) => (
            <motion.a
              key={tool.title}
              href={tool.href}
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-2xl border border-line bg-panel/70 p-5 backdrop-blur transition-all duration-300 hover:border-gold/50 hover:shadow-[0_0_45px_-16px_rgba(240,180,41,0.55)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/12 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  {tool.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold">{tool.title}</h3>
                <p className="text-sm leading-relaxed text-muted2">{tool.desc}</p>
                <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
                  <span className="font-mono2 text-[11px] text-dim">{tool.stat}</span>
                  <span className="text-sm font-bold text-gold transition-transform group-hover:translate-x-1">Open →</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-8 text-center">
          <motion.a
            href="/tools"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex rounded-xl border border-gold/40 px-6 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/10"
          >
            View all free calculators →
          </motion.a>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   6. FEATURES
   ===================================================================== */

const featuresData = [
  {
    icon: "📊",
    title: "Advanced Analytics",
    desc: "Win rate by setup, session, day, and emotion. Direction splits, equity curve, and a P&L calendar heatmap to spot exactly where your edge lives.",
    accent: "from-gold/20 to-transparent",
    glow: "group-hover:shadow-[0_0_50px_-10px_rgba(240,180,41,0.4)]",
  },
  {
    icon: "🤖",
    title: "AI Trading Coach",
    desc: "Per-trade feedback and weekly reports. Your AI coach reads your full journal, calls out revenge trading & FOMO, and gives one concrete action.",
    accent: "from-blue2/20 to-transparent",
    glow: "group-hover:shadow-[0_0_50px_-10px_rgba(76,130,251,0.4)]",
  },
  {
    icon: "🧠",
    title: "Psychology Journal",
    desc: "Daily mindset logging with mood tracking. AI surfaces FOMO, revenge, and overconfidence patterns before they cost you.",
    accent: "from-purple2/20 to-transparent",
    glow: "group-hover:shadow-[0_0_50px_-10px_rgba(168,85,247,0.4)]",
  },
  {
    icon: "💳",
    title: "Prop Firm Tracker",
    desc: "Track trailing drawdown, daily loss limits, and account health across every prop account. Never blow an account again.",
    accent: "from-bear/20 to-transparent",
    glow: "group-hover:shadow-[0_0_50px_-10px_rgba(255,69,101,0.4)]",
  },
  {
    icon: "🏆",
    title: "Verified P&L Certificates",
    desc: "Generate a shareable, independently-verifiable performance certificate with a QR code. Prove your results are real — to funders, mentors, or yourself.",
    accent: "from-gold/20 to-transparent",
    glow: "group-hover:shadow-[0_0_50px_-10px_rgba(240,180,41,0.4)]",
  },
  {
    icon: "☁️",
    title: "Cloud Sync Everywhere",
    desc: "Data syncs across all your devices. Log on your phone, review on desktop. Always backed up, always with you.",
    accent: "from-bull/20 to-transparent",
    glow: "group-hover:shadow-[0_0_50px_-10px_rgba(0,208,132,0.4)]",
  },
];

function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// Features</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything a serious trader <span className="text-shimmer">needs</span>
          </h2>
          <p className="mt-4 text-muted2">
            From granular analytics to AI-powered coaching — one journal that actually makes you better.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuresData.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8 }}
              className={`group relative overflow-hidden rounded-2xl border border-line bg-panel/70 p-6 backdrop-blur transition-all duration-300 hover:border-gold/40 ${f.glow}`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${f.accent}`} />
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted2">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   7. PLAYBOOK & P&L CALENDAR
   ===================================================================== */

const SETUPS = [
  { name: "London ORB", trades: 34, winRate: 71, avgR: 2.4, best: true, leak: false },
  { name: "NY Open Drive", trades: 28, winRate: 64, avgR: 1.8, best: false, leak: false },
  { name: "FVG Retest", trades: 41, winRate: 58, avgR: 1.2, best: false, leak: false },
  { name: "Liquidity Sweep", trades: 19, winRate: 63, avgR: 1.6, best: false, leak: false },
  { name: "Range Fade", trades: 22, winRate: 41, avgR: -0.4, best: false, leak: true },
];

const MONTH: (number | null)[] = [
  null, null, 1.8, -0.9, 2.4, 0.6, null,
  null, 1.1, -0.5, 3.2, 0.8, -1.0, null,
  null, 2.1, 1.6, -0.3, 0.9, 2.7, null,
  null, -1.2, -0.8, 0.4, 1.9, 1.3, null,
  null, 0.7, 2.2, -0.6, 1.4, null, null,
];

function dayColor(v: number | null) {
  if (v === null) return "border-transparent bg-transparent";
  if (v > 2) return "border-bull/60 bg-bull/30 text-bull shadow-[0_0_12px_rgba(0,208,132,0.35)]";
  if (v > 0) return "border-bull/30 bg-bull/12 text-bull";
  if (v < -0.7) return "border-bear/50 bg-bear/25 text-bear";
  return "border-bear/30 bg-bear/12 text-bear";
}

function Playbook() {
  return (
    <section id="playbook" className="relative overflow-hidden py-20 sm:py-28">
      <div className="animate-pulse-glow absolute top-1/4 -left-40 h-96 w-96 rounded-full bg-gold/8 blur-[130px]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// Playbook & Calendar</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Know your <span className="text-shimmer">best setup</span>. Kill your worst.
          </h2>
          <p className="mt-4 text-muted2">
            Every setup gets its own stat line. Every day gets its own square. Your edge stops being a feeling and becomes a number.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Playbook setup stats */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-line bg-panel/70 p-5 backdrop-blur sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold">
                <span className="text-xl">📒</span> Playbook — by setup
              </h3>
              <span className="rounded-full border border-line px-2.5 py-0.5 font-mono2 text-[10px] text-dim">last 90 days</span>
            </div>

            <div className="space-y-3.5">
              {SETUPS.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    s.best
                      ? "border-gold/40 bg-gold/8"
                      : s.leak
                        ? "border-bear/30 bg-bear/5"
                        : "border-line bg-ink2/60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{s.name}</span>
                      {s.best && (
                        <span className="gold-gradient rounded-full px-2 py-0.5 font-mono2 text-[9px] font-bold text-ink">A+ SETUP</span>
                      )}
                      {s.leak && (
                        <span className="rounded-full bg-bear/20 px-2 py-0.5 font-mono2 text-[9px] font-bold text-bear">LEAK 🚨</span>
                      )}
                    </div>
                    <span className={`font-mono2 text-sm font-bold ${s.avgR >= 0 ? "text-bull" : "text-bear"}`}>
                      {s.avgR >= 0 ? "+" : ""}{s.avgR.toFixed(1)}R avg
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/80">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${s.winRate}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.4 + i * 0.1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          s.leak ? "bg-gradient-to-r from-bear/70 to-bear" : "bg-gradient-to-r from-gold2 to-gold"
                        }`}
                      />
                    </div>
                    <span className="w-14 text-right font-mono2 text-xs text-muted2">{s.winRate}% WR</span>
                    <span className="w-16 text-right font-mono2 text-[10px] text-dim">{s.trades} trades</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1 }}
              className="mt-4 rounded-lg border border-gold/25 bg-gold/8 px-3 py-2 font-mono2 text-[10px] text-muted2"
            >
              <span className="font-bold text-gold">🤖 AI Coach:</span> Cut "Range Fade" — it cost you 8.8R this quarter. Doubling down on London ORB alone would have added +11.2R.
            </motion.p>
          </motion.div>

          {/* Monthly P&L calendar */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-line bg-panel/70 p-5 backdrop-blur sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold">
                <span className="text-xl">🗓️</span> P&L Calendar
              </h3>
              <span className="rounded-full border border-bull/30 bg-bull/10 px-2.5 py-0.5 font-mono2 text-[10px] font-bold text-bull">
                +18.4R · 16W / 7L days
              </span>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center font-mono2 text-[9px] text-dim">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {MONTH.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.02, type: "spring", stiffness: 300, damping: 20 }}
                  whileHover={v !== null ? { scale: 1.15, zIndex: 10 } : undefined}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border font-mono2 ${dayColor(v)}`}
                >
                  {v !== null && (
                    <>
                      <span className="text-[8px] opacity-60">{i - 1}</span>
                      <span className="text-[9px] font-bold sm:text-[10px]">
                        {v > 0 ? "+" : ""}{v.toFixed(1)}
                      </span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* week summary strip */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[4.1, 3.6, 7.0, 0.6, 3.1].map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="rounded-lg border border-line bg-ink2/60 px-2 py-1.5 text-center"
                >
                  <p className="font-mono2 text-[8px] text-dim">WK {i + 1}</p>
                  <p className={`font-mono2 text-[10px] font-bold ${w >= 0 ? "text-bull" : "text-bear"}`}>+{w.toFixed(1)}R</p>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 }}
              className="mt-4 rounded-lg border border-line bg-ink2/60 px-3 py-2 font-mono2 text-[10px] text-muted2"
            >
              <span className="font-bold text-gold">Pattern found:</span> Mondays are your worst day (-2.0R avg). Your best window: Tue–Thu, first 2 hours of London.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   8. INTEGRATIONS — CSV import marquee
   ===================================================================== */

const PLATFORMS = [
  { name: "MetaTrader 4", icon: "📈" },
  { name: "MetaTrader 5", icon: "📊" },
  { name: "cTrader", icon: "⚡" },
  { name: "NinjaTrader", icon: "🥷" },
  { name: "TradingView", icon: "📉" },
  { name: "Tradovate", icon: "🔷" },
  { name: "Interactive Brokers", icon: "🌐" },
  { name: "Binance", icon: "🟡" },
  { name: "Bybit", icon: "🟠" },
  { name: "FTMO", icon: "🏦" },
  { name: "Topstep", icon: "🎯" },
  { name: "Apex", icon: "🚀" },
];

function Integrations() {
  const row = [...PLATFORMS, ...PLATFORMS];

  return (
    <section className="relative overflow-hidden border-y border-line/60 bg-ink2/40 py-14 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto mb-8 max-w-2xl px-4 text-center"
      >
        <p className="mb-2 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// Import from anywhere</p>
        <h3 className="text-xl font-bold sm:text-2xl">
          CSV import from <span className="text-gold">every major platform</span>
        </h3>
        <p className="mt-2 text-sm text-muted2">
          Export from your broker, drop the CSV in, and ProfitPnL maps every fill automatically — futures, forex, crypto, and prop accounts.
        </p>
      </motion.div>

      <div className="marquee-paused relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-ink to-transparent" />
        <div className="animate-marquee flex w-max items-center gap-4 py-2">
          {row.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-panel/70 px-5 py-3 whitespace-nowrap backdrop-blur transition-colors hover:border-gold/40"
            >
              <span className="text-lg">{p.icon}</span>
              <span className="text-sm font-semibold text-muted2">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-center font-mono2 text-xs text-dim"
      >
        + manual entry that takes under 30 seconds per trade
      </motion.p>
    </section>
  );
}

/* =====================================================================
   9. HOW IT WORKS
   ===================================================================== */

const stepsData = [
  {
    n: "1",
    title: "Log your trades",
    desc: "Add trades manually or import a CSV in seconds. Tag every trade with setup, session, and emotion.",
    icon: "✍️",
  },
  {
    n: "2",
    title: "See your edge",
    desc: "Dashboards break down your performance by every variable. Instantly spot what works and what bleeds.",
    icon: "🔍",
  },
  {
    n: "3",
    title: "Fix your leaks",
    desc: "Your AI Coach turns data into action — one specific fix per week to compound your edge.",
    icon: "🛠️",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden border-y border-line/60 bg-ink2/60 py-20 sm:py-28">
      <div className="animate-pulse-glow absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-gold/8 blur-[130px]" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// How it works</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Get started in <span className="text-shimmer">3 minutes</span>
          </h2>
          <p className="mt-4 text-muted2">No spreadsheets, no manual math. Just log and learn.</p>
        </motion.div>

        <div className="relative grid gap-8 sm:grid-cols-3">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
            className="absolute top-10 right-[16%] left-[16%] hidden h-px origin-left bg-gradient-to-r from-gold via-gold/60 to-gold/20 sm:block"
          />

          {stepsData.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="relative text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.18, type: "spring", stiffness: 260, damping: 16 }}
                className="gold-gradient relative z-10 mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl shadow-[0_0_35px_rgba(240,180,41,0.4)]"
              >
                {s.icon}
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-gold bg-ink font-mono2 text-xs font-bold text-gold">
                  {s.n}
                </span>
              </motion.div>
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted2">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   10. TESTIMONIALS
   ===================================================================== */

const reviewsData = [
  {
    quote: "The AI Coach caught a revenge-trading pattern I'd been blind to for months. Found my leak in week one.",
    name: "Marcus T.",
    role: "Futures Prop Trader",
    initial: "M",
    color: "bg-gold/20 text-gold border-gold/40",
  },
  {
    quote: "Finally a journal that doesn't feel like homework. Logging takes 30 seconds and the analytics are genuinely insightful.",
    name: "Sara K.",
    role: "Gold Day Trader",
    initial: "S",
    color: "bg-purple2/20 text-purple2 border-purple2/40",
  },
  {
    quote: "The prop firm tracker saved my account. Drawdown bar turned red and I cut size immediately. Worth Pro alone.",
    name: "Dev P.",
    role: "Multi-account Prop",
    initial: "D",
    color: "bg-blue2/20 text-blue2 border-blue2/40",
  },
];

function Testimonials() {
  return (
    <section id="reviews" className="relative overflow-hidden py-20 sm:py-28">
      <div className="animate-pulse-glow absolute top-1/2 -right-40 h-96 w-96 -translate-y-1/2 rounded-full bg-gold/8 blur-[130px]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// Loved by traders</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Built by traders, <span className="text-shimmer">for traders</span>
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {reviewsData.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 40, rotate: i === 1 ? 0 : i === 0 ? -1.5 : 1.5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative rounded-2xl border border-line bg-panel/70 p-6 backdrop-blur transition-colors hover:border-gold/40"
            >
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.14 }}
                className="mb-3 text-sm tracking-widest text-gold"
              >
                ★★★★★
              </motion.p>
              <p className="text-sm leading-relaxed text-txt/90">"{r.quote}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-line/60 pt-4">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border font-bold ${r.color}`}>
                  {r.initial}
                </span>
                <div>
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="text-xs text-dim">{r.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   11. PRICING
   ===================================================================== */

const plansData = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tag: null as string | null,
    features: [
      { t: "Up to 50 trades", ok: true, bold: true },
      { t: "Basic analytics", ok: true, bold: false },
      { t: "1 account", ok: true, bold: false },
      { t: "CSV import/export", ok: true, bold: false },
      { t: "AI Coach", ok: false, bold: false },
      { t: "Psychology journal", ok: false, bold: false },
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro ⭐",
    price: "$19 USD",
    period: "/mo · 7-day free trial",
    tag: "MOST POPULAR" as string | null,
    features: [
      { t: "Unlimited trades", ok: true, bold: true },
      { t: "Full analytics suite", ok: true, bold: false },
      { t: "Unlimited accounts", ok: true, bold: false },
      { t: "AI Coach + weekly report", ok: true, bold: false },
      { t: "Psychology journal", ok: true, bold: false },
      { t: "Verified P&L certificates", ok: true, bold: false },
      { t: "Cloud sync all devices", ok: true, bold: false },
    ],
    cta: "Start 7-Day Trial →",
    highlight: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-14 text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// Pricing</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Simple, <span className="text-shimmer">honest pricing</span>
          </h2>
          <p className="mt-4 text-muted2">Start free forever. Upgrade when you're ready. Cancel any time.</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {plansData.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.65, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -10 }}
              className={
                p.highlight
                  ? "border-spin relative rounded-2xl shadow-[0_0_70px_-15px_rgba(240,180,41,0.45)]"
                  : "relative rounded-2xl border border-line bg-panel/70 transition-colors hover:border-gold/30"
              }
            >
              <div className={`h-full rounded-2xl p-7 ${p.highlight ? "bg-panel/95" : ""}`}>
                {p.tag && (
                  <span className="gold-gradient absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 font-mono2 text-[10px] font-bold tracking-wider text-ink shadow-[0_0_20px_rgba(240,180,41,0.6)]">
                    {p.tag}
                  </span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`font-mono2 text-4xl font-bold ${p.highlight ? "text-gold" : ""}`}>{p.price}</span>
                  <span className="text-sm text-dim">{p.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f.t} className={`flex items-start gap-2 text-sm ${f.ok ? "text-txt/90" : "text-dim line-through decoration-dim/50"}`}>
                      {f.ok ? (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-bull" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-bear/70" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.3 6.3a1 1 0 011.4 0L10 8.6l2.3-2.3a1 1 0 111.4 1.4L11.4 10l2.3 2.3a1 1 0 01-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 01-1.4-1.4L8.6 10 6.3 7.7a1 1 0 010-1.4z" />
                        </svg>
                      )}
                      <span className={f.bold ? "font-bold" : ""}>{f.t}</span>
                    </li>
                  ))}
                </ul>
                <motion.a
                  href={p.highlight ? "/register?trial=true" : "#cta"}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`mt-8 block rounded-xl py-3 text-center font-bold transition-shadow ${
                    p.highlight
                      ? "gold-gradient text-ink shadow-[0_0_30px_rgba(240,180,41,0.4)] hover:shadow-[0_0_45px_rgba(240,180,41,0.6)]"
                      : "border border-line text-txt hover:border-gold/50 hover:text-gold"
                  }`}
                >
                  {p.cta}
                </motion.a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   12. FAQ
   ===================================================================== */

const faqsData = [
  {
    q: "Is there really a free plan?",
    a: "Yes — Free forever, no card needed. You get 50 trades, basic analytics, and 1 account. Upgrade any time to unlock the AI Coach, psychology journal, and unlimited everything.",
  },
  {
    q: "Do I need to enter a card for the trial?",
    a: "No card is charged during your 7-day Pro trial. Add a card only when you decide to continue — cancel before the trial ends and pay nothing.",
  },
  {
    q: "Can I cancel any time?",
    a: "Absolutely. Cancel in one click from Settings → Manage Billing. You keep Pro access until your billing period ends, then drop to Free. No lock-in, ever.",
  },
  {
    q: "Is my data safe?",
    a: "Your trade data is encrypted in transit and at rest, isolated to your account, and never shared. You can export or delete everything at any time.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes — ProfitPnL is fully mobile-first and installable as an app to your home screen. Log trades on your phone, review on desktop.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative overflow-hidden border-t border-line/60 bg-ink2/40 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <p className="mb-3 font-mono2 text-xs tracking-[0.3em] text-gold uppercase">// FAQ</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-shimmer">Questions?</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqsData.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={f.q}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`overflow-hidden rounded-xl border backdrop-blur transition-colors ${
                  isOpen ? "border-gold/40 bg-panel/90" : "border-line bg-panel/60 hover:border-gold/25"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className={`font-semibold transition-colors ${isOpen ? "text-gold" : "text-txt"}`}>{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-lg leading-none ${
                      isOpen ? "border-gold/50 text-gold" : "border-line text-muted2"
                    }`}
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted2">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   13. CTA
   ===================================================================== */

function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-20 sm:py-28">
      <div className="trading-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]" />
      <div className="animate-pulse-glow absolute top-1/2 left-1/2 h-80 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/12 blur-[130px]" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="border-spin rounded-3xl"
        >
          <div className="rounded-3xl bg-panel/95 px-6 py-12 sm:px-12 sm:py-16">
            <motion.img
              src="/favicon.png"
              alt="ProfitPnL"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6 h-16 w-16 aspect-square object-contain rounded-2xl shadow-[0_0_45px_rgba(240,180,41,0.5)] shrink-0"
            />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your edge is hiding in your <span className="text-shimmer">trade history</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted2">
              Stop guessing. Journal your next trade in under 30 seconds and let the data — and your AI Coach — show you exactly what to fix.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.a
                href="/register"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className="gold-gradient group relative w-full overflow-hidden rounded-xl px-8 py-4 font-bold text-ink shadow-[0_0_40px_rgba(240,180,41,0.5)] sm:w-auto"
              >
                <span className="relative z-10">Get Started Free</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </motion.a>
              <motion.a
                href="/register?trial=true"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className="w-full rounded-xl border border-line px-8 py-4 font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold sm:w-auto"
              >
                Start 7-Day Pro Trial →
              </motion.a>
            </div>
            <p className="mt-6 font-mono2 text-xs text-dim">Free forever plan · No card needed · Cancel anytime</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* =====================================================================
   14. FOOTER
   ===================================================================== */

const footerCols = [
  {
    h: "Product",
    items: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Free Tools", href: "/tools" },
      { label: "AI Coach", href: "#features" },
      { label: "Prop Tracker", href: "#features" },
    ],
  },
  {
    h: "Resources",
    items: [
      { label: "Journaling Guides", href: "/journaling-guides" },
      { label: "CSV Templates", href: "/csv-templates" },
      { label: "Free Calculators", href: "/tools" },
      { label: "Certificates", href: "/certificates" },
    ],
  },
  {
    h: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Risk Disclaimer", href: "/risk-disclaimer" },
    ],
  },
];

function Footer() {
  return (
    <footer className="relative border-t border-line/60 bg-ink2/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="ProfitPnL"
                className="h-9 w-auto"
              />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted2">
              The professional trading journal for serious traders. Log every trade, decode every pattern, and let your AI Coach fix the leaks.
            </p>
            <div className="mt-5 flex gap-3">
              {["𝕏", "in", "▶", "◆"].map((s, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.15, y: -3 }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-sm text-muted2 transition-colors hover:border-gold/50 hover:text-gold"
                >
                  {s}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {footerCols.map((c, ci) => (
            <motion.div
              key={c.h}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 + ci * 0.08 }}
            >
              <h4 className="mb-4 font-mono2 text-xs font-bold tracking-widest text-txt/80 uppercase">{c.h}</h4>
              <ul className="space-y-2.5">
                {c.items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-dim transition-all hover:pl-1 hover:text-gold">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line/60 pt-6 sm:flex-row">
          <p className="font-mono2 text-xs text-dim">© {new Date().getFullYear()} ProfitPnL. All rights reserved.</p>
          <p className="font-mono2 text-[10px] text-dim">
            A journal, not financial advice. Trading involves risk.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* =====================================================================
   PAGE — everything assembled
   ===================================================================== */

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased">
      <Navbar />
      <main className="overflow-x-hidden pt-14">
        <TickerTape />
        <Hero />
        <Stats />
        <ToolsPreview />
        <Features />
        <Playbook />
        <Integrations />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
