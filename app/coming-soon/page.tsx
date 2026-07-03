"use client";

import { useEffect, useMemo, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   ProfitPnL — Coming Soon (single-file build)
   ALL components, data, and CSS live in this one file.
   Palette:
     bg #080810 · bg2 #0d0d1a · card #161628 · border #1e1e38
     text #f0f0ff · muted #a0a0c0 · dim #5a5a80
     gold #f0b429 · gold2 #c8961e · green #00d084
     red #ff4565 · blue #4c82fb · purple #a855f7
   ═══════════════════════════════════════════════════════════════ */

/* ---------------- All custom CSS (injected via <style>) ---------------- */

const CSS = `
html, body {
  background: #080810;
  color: #f0f0ff;
  overflow-x: hidden;
}

::selection {
  background: rgba(240,180,41,0.35);
  color: #f0f0ff;
}

@keyframes gridPan { from { background-position: 0 0; } to { background-position: 48px 48px; } }

@keyframes orbDrift1 {
  0%, 100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(60px,-40px) scale(1.15); }
  66% { transform: translate(-40px,30px) scale(0.9); }
}
@keyframes orbDrift2 {
  0%, 100% { transform: translate(0,0) scale(1); }
  40% { transform: translate(-70px,50px) scale(1.2); }
  75% { transform: translate(40px,-30px) scale(0.85); }
}
@keyframes orbDrift3 {
  0%, 100% { transform: translate(0,0) scale(0.95); }
  50% { transform: translate(50px,60px) scale(1.1); }
}

@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes floatY2 { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }

@keyframes particleRise {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: var(--p-op, 0.6); }
  90% { opacity: var(--p-op, 0.6); }
  100% { transform: translateY(-110vh); opacity: 0; }
}

@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

@keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }

@keyframes letterPop {
  0% { opacity: 0; transform: translateY(30px) scale(0.8) rotateX(60deg); filter: blur(6px); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
}

@keyframes shimmerText { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }

@keyframes goldPulse {
  0%, 100% { box-shadow: 0 0 24px rgba(240,180,41,0.35), 0 0 60px rgba(240,180,41,0.12); }
  50% { box-shadow: 0 0 44px rgba(240,180,41,0.6), 0 0 100px rgba(240,180,41,0.22); }
}

@keyframes ringDash { from { stroke-dashoffset: 260; } to { stroke-dashoffset: 88; } }
@keyframes drawLine { 0% { stroke-dashoffset: 1000; } 60% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; } }
@keyframes dotBlink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }
@keyframes pingSlow { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes candleGrow { 0%, 100% { transform: scaleY(0.55); } 50% { transform: scaleY(1); } }
@keyframes digitTick { 0% { transform: translateY(-100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes borderSpin { to { transform: rotate(360deg); } }
@keyframes scanline { 0% { top: -10%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 110%; opacity: 0; } }
@keyframes logoBeat {
  0%, 100% { transform: scale(1) rotate(0deg); }
  10% { transform: scale(1.08) rotate(-3deg); }
  20% { transform: scale(1) rotate(0deg); }
}
@keyframes wiggle { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

.bg-grid {
  background-image:
    linear-gradient(rgba(30,30,56,0.55) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30,30,56,0.55) 1px, transparent 1px);
  background-size: 48px 48px;
  animation: gridPan 5s linear infinite;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 75%);
}

.anim-fade-up { opacity: 0; animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) forwards; }

.anim-letter {
  display: inline-block;
  opacity: 0;
  animation: letterPop 0.7s cubic-bezier(0.22,1,0.36,1) forwards;
  transform-origin: bottom center;
}

.text-shimmer-gold {
  background: linear-gradient(110deg, #c8961e 20%, #f0b429 38%, #fff3d1 50%, #f0b429 62%, #c8961e 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmerText 3.5s linear infinite;
}

.btn-gold-glow { animation: goldPulse 2.6s ease-in-out infinite; }

.marquee-track { animation: marquee 42s linear infinite; }
.marquee-track:hover { animation-play-state: paused; }

.curve-path { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: drawLine 7s ease-in-out infinite; }

.card-shine { position: relative; overflow: hidden; }
.card-shine::after {
  content: "";
  position: absolute;
  left: 0; right: 0;
  height: 40%;
  background: linear-gradient(180deg, transparent, rgba(240,180,41,0.06), transparent);
  animation: scanline 6s linear infinite;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/* ---------------- Data ---------------- */

type Trade = { side: "LONG" | "SHORT"; symbol: string; setup: string; r: string; win: boolean };

const TRADES: Trade[] = [
  { side: "LONG", symbol: "ES", setup: "VWAP Bounce", r: "+2.1R", win: true },
  { side: "SHORT", symbol: "GBPJPY", setup: "Range Fade", r: "-0.5R", win: false },
  { side: "LONG", symbol: "NQ", setup: "NY Open Drive", r: "+3.4R", win: true },
  { side: "LONG", symbol: "XAUUSD", setup: "Liquidity Sweep", r: "+1.8R", win: true },
  { side: "SHORT", symbol: "BTC", setup: "Supply Retest", r: "+2.6R", win: true },
  { side: "SHORT", symbol: "EURUSD", setup: "FVG Rejection", r: "-1.0R", win: false },
  { side: "LONG", symbol: "SPY", setup: "Trend Pullback", r: "+1.2R", win: true },
  { side: "LONG", symbol: "CL", setup: "Breakout Retest", r: "+2.9R", win: true },
  { side: "SHORT", symbol: "US30", setup: "Double Top", r: "+1.5R", win: true },
  { side: "LONG", symbol: "ETH", setup: "OB Reclaim", r: "-0.8R", win: false },
];

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 137.5) % 100}%`,
  size: 2 + ((i * 7) % 4),
  delay: `${(i * 1.7) % 18}s`,
  duration: `${14 + ((i * 3) % 12)}s`,
  color: ["#f0b429", "#00d084", "#4c82fb", "#a855f7", "#5a5a80"][i % 5],
  opacity: 0.25 + ((i * 13) % 40) / 100,
}));

const CANDLES = Array.from({ length: 40 }, (_, i) => {
  const seed = Math.sin(i * 12.9898) * 43758.5453;
  const r = seed - Math.floor(seed);
  return { height: 24 + r * 120, green: r > 0.42, delay: `${(i * 0.35) % 4}s`, duration: `${3 + r * 4}s` };
});

const SOCIALS = [
  {
    label: "X / Twitter",
    href: "https://x.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "Discord",
    href: "https://discord.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12z" />
      </svg>
    ),
  },
];

/* ---------------- Background ---------------- */

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="bg-grid absolute inset-0" />

      <div
        className="absolute -top-32 left-1/4 h-[480px] w-[480px] rounded-full blur-[140px]"
        style={{
          background: "radial-gradient(circle, rgba(240,180,41,0.16), transparent 70%)",
          animation: "orbDrift1 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full blur-[150px]"
        style={{
          background: "radial-gradient(circle, rgba(76,130,251,0.13), transparent 70%)",
          animation: "orbDrift2 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-40 -left-32 h-[460px] w-[460px] rounded-full blur-[140px]"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)",
          animation: "orbDrift3 18s ease-in-out infinite",
        }}
      />

      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-[-2%] rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            ["--p-op" as string]: p.opacity,
            animation: `particleRise ${p.duration} linear infinite`,
            animationDelay: p.delay,
            opacity: 0,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 flex h-44 items-end justify-center gap-[10px] opacity-[0.16]">
        {CANDLES.map((c, i) => (
          <div key={i} className="flex flex-col items-center" style={{ height: c.height }}>
            <div
              className="w-[6px] flex-1 origin-bottom rounded-sm"
              style={{
                background: c.green
                  ? "linear-gradient(180deg, #00d084, rgba(0,208,132,0.15))"
                  : "linear-gradient(180deg, #ff4565, rgba(255,69,101,0.15))",
                animation: `candleGrow ${c.duration} ease-in-out infinite`,
                animationDelay: c.delay,
              }}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#080810] via-[#080810]/60 to-transparent" />

      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgba(8,8,16,0.85))" }}
      />
    </div>
  );
}

/* ---------------- Ticker Tape ---------------- */

function TradeChip({ t }: { t: Trade }) {
  return (
    <span className="mx-6 inline-flex items-center gap-2 font-mono text-xs tracking-wide whitespace-nowrap">
      <span className="text-[#5a5a80]">JOURNALED ›</span>
      <span className={t.side === "LONG" ? "font-bold text-[#00d084]" : "font-bold text-[#ff4565]"}>{t.side}</span>
      <span className="font-semibold text-[#f0f0ff]">{t.symbol}</span>
      <span className="text-[#5a5a80]">·</span>
      <span className="text-[#a0a0c0]">{t.setup}</span>
      <span className="text-[#5a5a80]">·</span>
      <span className={t.win ? "font-bold text-[#00d084]" : "font-bold text-[#ff4565]"}>{t.r}</span>
    </span>
  );
}

function TickerTape({ position }: { position: "top" | "bottom" }) {
  const list = position === "bottom" ? [...TRADES].reverse() : TRADES;
  return (
    <div
      className={`w-full overflow-hidden border-[#1e1e38] bg-[#0d0d1a]/70 backdrop-blur-sm ${
        position === "top" ? "border-b" : "border-t"
      }`}
      style={{
        maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        className="marquee-track flex w-max py-2.5"
        style={position === "bottom" ? { animationDirection: "reverse", animationDuration: "55s" } : undefined}
      >
        {[...list, ...list].map((t, i) => (
          <TradeChip key={i} t={t} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Countdown ---------------- */

function getTarget(): number {
  const KEY = "profitpnl_launch_target";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && Number(saved) > Date.now()) return Number(saved);
    const t = Date.now() + 2 * 5 * 54 * 60 * 1000; // ~3 days out
    localStorage.setItem(KEY, String(t));
    return t;
  } catch {
    return Date.now() + 32 * 24 * 60 * 60 * 1000;
  }
}

function diff(target: number) {
  const d = Math.max(0, target - Date.now());
  return {
    days: Math.floor(d / 86400000),
    hours: Math.floor((d / 3600000) % 24),
    minutes: Math.floor((d / 60000) % 60),
    seconds: Math.floor((d / 1000) % 60),
  };
}

function Digit({ value }: { value: string }) {
  return (
    <span key={value} className="inline-block" style={{ animation: "digitTick 0.45s cubic-bezier(0.22,1,0.36,1)" }}>
      {value}
    </span>
  );
}

function Unit({ value, label, accent }: { value: number; label: string; accent: string }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className="group relative">
      <div className="absolute -inset-px overflow-hidden rounded-2xl">
        <div
          className="absolute -inset-[100%]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 60deg, transparent 120deg)`,
            animation: "borderSpin 5s linear infinite",
            opacity: 0.55,
          }}
        />
      </div>
      <div className="card-shine relative flex w-[74px] flex-col items-center rounded-2xl border border-[#1e1e38] bg-[#161628]/90 px-2 py-3.5 backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-1 sm:w-[92px] sm:py-4">
        <div className="overflow-hidden font-mono text-3xl font-bold tracking-tight text-[#f0f0ff] tabular-nums sm:text-4xl">
          <Digit value={str[0]} />
          <Digit value={str[1]} />
        </div>
        <div className="mt-1.5 text-[10px] font-semibold tracking-[0.22em] text-[#5a5a80] uppercase">{label}</div>
      </div>
    </div>
  );
}

function Countdown() {
  const target = useMemo(getTarget, []);
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-4">
      <Unit value={t.days} label="Days" accent="#f0b429" />
      <span className="pb-6 font-mono text-2xl text-[#5a5a80]" style={{ animation: "dotBlink 1s ease-in-out infinite" }}>:</span>
      <Unit value={t.hours} label="Hours" accent="#00d084" />
      <span className="pb-6 font-mono text-2xl text-[#5a5a80]" style={{ animation: "dotBlink 1s ease-in-out infinite", animationDelay: "0.25s" }}>:</span>
      <Unit value={t.minutes} label="Mins" accent="#4c82fb" />
      <span className="pb-6 font-mono text-2xl text-[#5a5a80]" style={{ animation: "dotBlink 1s ease-in-out infinite", animationDelay: "0.5s" }}>:</span>
      <Unit value={t.seconds} label="Secs" accent="#a855f7" />
    </div>
  );
}

/* ---------------- Waitlist Form ---------------- */

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setTimeout(() => setState("idle"), 900);
      return;
    }
    setState("done");
  };

  if (state === "done") {
    return (
      <div
        className="mx-auto flex w-full max-w-md items-center justify-center gap-3 rounded-2xl border border-[#00d084]/30 bg-[#00d084]/10 px-6 py-4"
        style={{ animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1)" }}
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#00d084]" style={{ animation: "pingSlow 1.6s ease-out infinite" }} />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00d084]" />
        </span>
        <p className="font-medium text-[#00d084]">
          You&apos;re on the list! <span className="text-[#a0a0c0]">We&apos;ll ping you at launch. 🚀</span>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row"
      style={state === "error" ? { animation: "wiggle 0.3s ease-in-out 2" } : undefined}
    >
      <div className="relative flex-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="trader@example.com"
          className={`w-full rounded-xl border bg-[#0d0d1a] px-4 py-3.5 font-mono text-sm text-[#f0f0ff] placeholder-[#5a5a80] transition-all duration-300 outline-none focus:border-[#f0b429]/60 focus:shadow-[0_0_0_3px_rgba(240,180,41,0.12),0_0_24px_rgba(240,180,41,0.15)] ${
            state === "error" ? "border-[#ff4565]/70 shadow-[0_0_0_3px_rgba(255,69,101,0.15)]" : "border-[#1e1e38]"
          }`}
        />
      </div>
      <button
        type="submit"
        className="btn-gold-glow group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#f0b429] to-[#c8961e] px-7 py-3.5 text-sm font-bold text-[#080810] transition-transform duration-200 hover:scale-[1.04] active:scale-95"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          Join Waitlist
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </form>
  );
}

/* ---------------- Floating Stat Cards ---------------- */

function EquityCard({ className = "", delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <div
      className={`card-shine w-56 rounded-2xl border border-[#1e1e38] bg-[#161628]/80 p-4 backdrop-blur-md ${className}`}
      style={{ animation: `floatY 6s ease-in-out infinite`, animationDelay: delay }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-[#5a5a80] uppercase">Equity Curve</span>
        <span className="font-mono text-[11px] font-bold text-[#00d084]">+38.3R</span>
      </div>
      <svg viewBox="0 0 200 70" className="h-16 w-full">
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0b429" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,62 L18,55 L34,58 L52,44 L68,48 L86,34 L102,38 L120,26 L138,30 L156,16 L176,20 L200,6 L200,70 L0,70 Z"
          fill="url(#eqFill)"
        />
        <path
          className="curve-path"
          d="M0,62 L18,55 L34,58 L52,44 L68,48 L86,34 L102,38 L120,26 L138,30 L156,16 L176,20 L200,6"
          fill="none"
          stroke="#f0b429"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="200" cy="6" r="3.5" fill="#f0b429">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function WinRateCard({ className = "", delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <div
      className={`card-shine w-44 rounded-2xl border border-[#1e1e38] bg-[#161628]/80 p-4 backdrop-blur-md ${className}`}
      style={{ animation: `floatY2 7s ease-in-out infinite`, animationDelay: delay }}
    >
      <span className="text-[10px] font-semibold tracking-[0.18em] text-[#5a5a80] uppercase">Win Rate</span>
      <div className="mt-2 flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="h-14 w-14 -rotate-90">
          <circle cx="50" cy="50" r="41" fill="none" stroke="#1e1e38" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="41" fill="none" stroke="#f0b429" strokeWidth="10" strokeLinecap="round"
            strokeDasharray="260"
            style={{ animation: "ringDash 2.4s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: "0.8s", strokeDashoffset: 260 }}
          />
        </svg>
        <div>
          <div className="font-mono text-xl font-bold text-[#f0b429]">66%</div>
          <div className="font-mono text-[10px] text-[#5a5a80]">25W / 13L</div>
        </div>
      </div>
    </div>
  );
}

function TradeBadge({
  className = "",
  delay = "0s",
  side,
  symbol,
  r,
}: {
  className?: string;
  delay?: string;
  side: "LONG" | "SHORT";
  symbol: string;
  r: string;
}) {
  const win = r.startsWith("+");
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-[#1e1e38] bg-[#161628]/80 px-3.5 py-2.5 font-mono text-xs backdrop-blur-md ${className}`}
      style={{ animation: `floatY 5.5s ease-in-out infinite`, animationDelay: delay }}
    >
      <span className={`font-bold ${side === "LONG" ? "text-[#00d084]" : "text-[#ff4565]"}`}>{side}</span>
      <span className="font-semibold text-[#f0f0ff]">{symbol}</span>
      <span className={`font-bold ${win ? "text-[#00d084]" : "text-[#ff4565]"}`}>{r}</span>
    </div>
  );
}

function AiBadge({ className = "", delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-[#a855f7]/30 bg-[#161628]/80 px-3.5 py-2.5 backdrop-blur-md ${className}`}
      style={{ animation: `floatY2 6.5s ease-in-out infinite`, animationDelay: delay }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#a855f7]" style={{ animation: "pingSlow 1.8s ease-out infinite" }} />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#a855f7]" />
      </span>
      <span className="text-xs font-medium text-[#a0a0c0]">
        AI Insight: <span className="text-[#a855f7]">Cut revenge trades</span>
      </span>
    </div>
  );
}

/* ---------------- Small pieces ---------------- */

function Letters({ text, base = 0, className = "" }: { text: string; base?: number; className?: string }) {
  return (
    <span className={className}>
      {text.split("").map((ch, i) => (
        <span key={i} className="anim-letter" style={{ animationDelay: `${base + i * 0.045}s` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="btn-gold-glow flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0b429] to-[#c8961e]"
        style={{ animation: "logoBeat 3.5s ease-in-out infinite" }}
      >
        <svg className="h-6 w-6 text-[#080810]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l5-5 4 4 8-8" />
          <path d="M16 8h4v4" />
        </svg>
      </div>
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-[#f0f0ff]">Profit</span>
        <span className="text-[#f0b429]">PnL</span>
      </span>
    </div>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#080810] font-sans text-[#f0f0ff]">
      <style>{CSS}</style>
      <Background />

      {/* top ticker */}
      <div className="anim-fade-up relative z-20" style={{ animationDelay: "0.1s" }}>
        <TickerTape position="top" />
      </div>

      {/* header */}
      <header className="anim-fade-up relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6" style={{ animationDelay: "0.2s" }}>
        <Logo />
        <a
          href="mailto:hello@profitpnl.com"
          className="hidden rounded-lg border border-[#1e1e38] bg-[#161628]/60 px-4 py-2 text-sm font-medium text-[#a0a0c0] backdrop-blur-sm transition-all duration-300 hover:border-[#f0b429]/50 hover:text-[#f0b429] sm:block"
        >
          hello@profitpnl.com
        </a>
      </header>

      {/* main */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        {/* floating cards — desktop */}
        <div className="pointer-events-none absolute inset-0 hidden xl:block">
          <div className="anim-fade-up absolute top-[10%] left-[-30px]" style={{ animationDelay: "1.4s" }}>
            <EquityCard />
          </div>
          <div className="anim-fade-up absolute bottom-[16%] left-[10px]" style={{ animationDelay: "1.7s" }}>
            <TradeBadge side="LONG" symbol="NQ" r="+3.4R" delay="1s" />
          </div>
          <div className="anim-fade-up absolute top-[12%] right-[-20px]" style={{ animationDelay: "1.5s" }}>
            <WinRateCard delay="0.6s" />
          </div>
          <div className="anim-fade-up absolute top-[46%] right-[-50px]" style={{ animationDelay: "1.9s" }}>
            <TradeBadge side="SHORT" symbol="GBPJPY" r="-0.5R" delay="1.8s" />
          </div>
          <div className="anim-fade-up absolute right-[0px] bottom-[12%]" style={{ animationDelay: "1.8s" }}>
            <AiBadge delay="0.4s" />
          </div>
        </div>

        {/* badge */}
        <div className="anim-fade-up mb-7 flex items-center gap-2.5 rounded-full border border-[#f0b429]/25 bg-[#161628]/70 px-5 py-2 backdrop-blur-sm" style={{ animationDelay: "0.35s" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#f0b429]" style={{ animation: "pingSlow 1.8s ease-out infinite" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f0b429]" />
          </span>
          <span className="text-xs font-semibold tracking-[0.2em] text-[#f0b429] uppercase">Launching Soon</span>
          <span className="text-[#5a5a80]">·</span>
          <span className="text-xs text-[#a0a0c0]">AI-Powered Trading Journal</span>
        </div>

        {/* headline */}
        <h1 className="text-[42px] leading-[1.05] font-extrabold tracking-tight sm:text-6xl lg:text-7xl" style={{ perspective: "800px" }}>
          <Letters text="Your Edge Is" base={0.5} className="text-[#f0f0ff]" />
          <br />
          <Letters text="Almost Here." base={1.05} className="text-shimmer-gold" />
        </h1>

        {/* subtitle */}
        <p className="anim-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg" style={{ animationDelay: "1.6s" }}>
          The professional trading journal built for serious traders. Track every trade,
          decode every pattern, and let AI tell you exactly what&apos;s holding you back.{" "}
          <span className="font-semibold text-[#f0f0ff]">profitpnl.com</span> is coming.
        </p>

        {/* countdown */}
        <div className="anim-fade-up mt-10" style={{ animationDelay: "1.85s" }}>
          <Countdown />
        </div>

        {/* waitlist */}
        <div className="anim-fade-up mt-10 w-full" style={{ animationDelay: "2.05s" }}>
          <WaitlistForm />
          <p className="mt-3 font-mono text-[11px] text-[#5a5a80]">
            <span className="text-[#00d084]">●</span> 2,847 traders already on the waitlist — early birds get{" "}
          </p>
        </div>

        {/* mobile stat strip */}
        <div className="anim-fade-up mt-12 flex flex-wrap items-center justify-center gap-3 xl:hidden" style={{ animationDelay: "2.2s" }}>
          <TradeBadge side="LONG" symbol="NQ" r="+3.4R" />
          <TradeBadge side="SHORT" symbol="BTC" r="+2.6R" delay="1.2s" />
          <AiBadge delay="0.5s" />
        </div>

        {/* socials */}
        <div className="anim-fade-up mt-12 flex items-center gap-3" style={{ animationDelay: "2.35s" }}>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1e1e38] bg-[#161628]/70 text-[#a0a0c0] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#f0b429]/50 hover:text-[#f0b429] hover:shadow-[0_8px_24px_rgba(240,180,41,0.18)]"
            >
              {s.icon}
            </a>
          ))}
        </div>
      </main>

      {/* footer + bottom ticker */}
      <footer className="anim-fade-up relative z-20" style={{ animationDelay: "0.3s" }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 pb-4 font-mono text-[11px] text-[#5a5a80] sm:flex-row">
          <span>© 2026 ProfitPnL · profitpnl.com</span>
          <span>
            Built for prop traders · <span className="text-[#00d084]">LONG</span> discipline ·{" "}
            <span className="text-[#ff4565]">SHORT</span> excuses
          </span>
        </div>
        <TickerTape position="bottom" />
      </footer>
    </div>
  );
}
