"use client";

import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   ProfitPnL — Animated Loader (single-file, self-contained)
   Usage:
     <Loader />                        → infinite loader
     <Loader onDone={() => ...} />     → simulates progress to 100%,
                                         fades out, then calls onDone
   All CSS is embedded below — no external stylesheet needed.
   Palette: #080810 bg · #161628 card · #f0b429 gold · #00d084 green
            #ff4565 red · #4c82fb blue · #a855f7 purple
   ═══════════════════════════════════════════════════════════════ */

const LOADER_CSS = `
@keyframes pnlGridPan { from { background-position: 0 0; } to { background-position: 44px 44px; } }
@keyframes pnlLogoBeat {
  0%, 100% { transform: scale(1) rotate(0deg); }
  12% { transform: scale(1.1) rotate(-4deg); }
  24% { transform: scale(1) rotate(0deg); }
}
@keyframes pnlGlowPulse {
  0%, 100% { box-shadow: 0 0 26px rgba(240,180,41,0.4), 0 0 70px rgba(240,180,41,0.14); }
  50% { box-shadow: 0 0 50px rgba(240,180,41,0.65), 0 0 110px rgba(240,180,41,0.25); }
}
@keyframes pnlRingSpin { to { transform: rotate(360deg); } }
@keyframes pnlRingSpinRev { to { transform: rotate(-360deg); } }
@keyframes pnlCandle {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}
@keyframes pnlWickBlink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@keyframes pnlShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes pnlBarStripe { from { background-position: 0 0; } to { background-position: 28px 0; } }
@keyframes pnlMsgIn {
  0% { opacity: 0; transform: translateY(10px); }
  12%, 88% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}
@keyframes pnlOrbit {
  from { transform: rotate(0deg) translateX(58px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(58px) rotate(-360deg); }
}
@keyframes pnlFadeOut {
  to { opacity: 0; visibility: hidden; }
}
@keyframes pnlDotPulse {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
.pnl-loader-grid {
  background-image:
    linear-gradient(rgba(30,30,56,0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30,30,56,0.5) 1px, transparent 1px);
  background-size: 44px 44px;
  animation: pnlGridPan 4s linear infinite;
  mask-image: radial-gradient(ellipse 60% 55% at 50% 50%, black 25%, transparent 72%);
  -webkit-mask-image: radial-gradient(ellipse 60% 55% at 50% 50%, black 25%, transparent 72%);
}
.pnl-shimmer-gold {
  background: linear-gradient(110deg, #c8961e 20%, #f0b429 38%, #fff3d1 50%, #f0b429 62%, #c8961e 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: pnlShimmer 2.8s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .pnl-loader *, .pnl-loader *::before, .pnl-loader *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;

const MESSAGES = [
  "Syncing your journal…",
  "Loading candles…",
  "Crunching R-multiples…",
  "Scanning for revenge trades…",
  "Drawing the equity curve…",
  "Finding your edge…",
];

const CANDLES = [
  { color: "#00d084", height: 34, delay: "0s" },
  { color: "#ff4565", height: 22, delay: "0.12s" },
  { color: "#00d084", height: 42, delay: "0.24s" },
  { color: "#00d084", height: 28, delay: "0.36s" },
  { color: "#ff4565", height: 36, delay: "0.48s" },
  { color: "#00d084", height: 48, delay: "0.6s" },
  { color: "#f0b429", height: 40, delay: "0.72s" },
];

const ORBIT_DOTS = [
  { color: "#f0b429", duration: "2.2s", delay: "0s" },
  { color: "#00d084", duration: "2.2s", delay: "-0.73s" },
  { color: "#4c82fb", duration: "2.2s", delay: "-1.46s" },
];

export default function Loader({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  /* simulated progress + message rotation + completion in one interval */
  useEffect(() => {
    let msgCounter = 0;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        const step = p < 60 ? 2.4 : p < 85 ? 1.2 : 0.5;
        const next = Math.min(100, p + step + Math.random() * 1.5);
        if (next >= 100 && !leaving) {
          setLeaving(true);
          setTimeout(() => onDoneRef.current?.(), 700);
        }
        return next;
      });
      msgCounter++;
      if (msgCounter % 27 === 0) { // ~1600ms given 60ms interval
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
      }
    }, 60);
    return () => clearInterval(id);
  }, [leaving]);

  const pct = Math.floor(progress);

  return (
    <div
      className="pnl-loader"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#080810",
        color: "#f0f0ff",
        overflow: "hidden",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        ...(leaving ? { animation: "pnlFadeOut 0.65s ease forwards" } : {}),
      }}
      role="status"
      aria-label="Loading ProfitPnL"
    >
      <style>{LOADER_CSS}</style>

      {/* animated grid backdrop */}
      <div className="pnl-loader-grid" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

      {/* soft gold glow behind center */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(240,180,41,0.10), transparent 65%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* ═══ center piece: rings + logo + orbit dots ═══ */}
      <div style={{ position: "relative", width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* outer conic ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, transparent 0deg, #f0b429 90deg, transparent 180deg)",
            animation: "pnlRingSpin 1.6s linear infinite",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))",
          }}
        />
        {/* inner counter-rotating ring */}
        <div
          style={{
            position: "absolute",
            inset: 16,
            borderRadius: "50%",
            background: "conic-gradient(from 180deg, transparent 0deg, #a855f7 70deg, transparent 140deg)",
            animation: "pnlRingSpinRev 2.4s linear infinite",
            opacity: 0.7,
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))",
          }}
        />
        {/* orbiting dots */}
        {ORBIT_DOTS.map((d, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: d.color,
              boxShadow: `0 0 10px ${d.color}`,
              animation: `pnlOrbit ${d.duration} linear infinite`,
              animationDelay: d.delay,
            }}
          />
        ))}
        {/* beating logo tile */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #f0b429, #c8961e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pnlLogoBeat 2.4s ease-in-out infinite, pnlGlowPulse 2.4s ease-in-out infinite",
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#080810" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l5-5 4 4 8-8" />
            <path d="M16 8h4v4" />
          </svg>
        </div>
      </div>

      {/* ═══ bouncing candlesticks ═══ */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 52, marginTop: 34 }}>
        {CANDLES.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: c.height, justifyContent: "flex-end" }}>
            <span
              style={{
                width: 1.5,
                height: 6,
                background: c.color,
                animation: "pnlWickBlink 1.4s ease-in-out infinite",
                animationDelay: c.delay,
              }}
            />
            <span
              style={{
                width: 8,
                height: "100%",
                borderRadius: 2,
                transformOrigin: "bottom",
                background: `linear-gradient(180deg, ${c.color}, ${c.color}44)`,
                boxShadow: `0 0 12px ${c.color}55`,
                animation: "pnlCandle 1.4s ease-in-out infinite",
                animationDelay: c.delay,
              }}
            />
          </div>
        ))}
      </div>

      {/* ═══ wordmark ═══ */}
      <div style={{ marginTop: 26, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
        <span style={{ color: "#f0f0ff" }}>Profit</span>
        <span className="pnl-shimmer-gold">PnL</span>
      </div>

      {/* ═══ progress bar ═══ */}
      <div style={{ marginTop: 22, width: 260, maxWidth: "72vw" }}>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: "#161628",
            border: "1px solid #1e1e38",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              transition: "width 0.15s ease-out",
              background:
                "linear-gradient(90deg, #c8961e, #f0b429), repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 7px, transparent 7px 14px)",
              backgroundBlendMode: "overlay",
              backgroundSize: "auto, 28px 100%",
              animation: "pnlBarStripe 0.8s linear infinite",
              boxShadow: "0 0 14px rgba(240,180,41,0.5)",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
          }}
        >
          {/* rotating message */}
          <span
            key={msgIndex}
            style={{ color: "#a0a0c0", animation: "pnlMsgIn 1.6s ease-in-out" }}
          >
            {MESSAGES[msgIndex]}
          </span>
          <span style={{ color: "#f0b429", fontWeight: 700 }}>{pct}%</span>
        </div>
      </div>

      {/* ═══ tri-dot pulse footer ═══ */}
      <div style={{ position: "absolute", bottom: 34, display: "flex", gap: 8 }}>
        {["#00d084", "#f0b429", "#ff4565"].map((c, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: c,
              boxShadow: `0 0 8px ${c}`,
              animation: "pnlDotPulse 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
