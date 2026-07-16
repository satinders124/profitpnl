"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Trophy, Copy, Layers, Eye, Cpu, Coins, Info, Check, ShieldAlert
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function BiasDeskIndicatorProduct() {
  const [copied, setCopied] = useState(false);
  const [activeFeature, setActiveFocus] = useState(0);

  const pineScriptCode = `//@version=6
indicator("BIAS DESK — Structure Bias [Fortune Forge]", 
          shorttitle="BIAS DESK PRO", 
          overlay=true, 
          max_labels_count=100)

// ── INPUTS (Exact as original) ───────────────────────────────────────────────
biasTF    = input.timeframe("240", "Bias Timeframe")
len       = input.int(3, "Swing Strength (Pivot Bars)", minval=2, maxval=10)
showInv   = input.bool(true,  "Invalidation Line")
showEq    = input.bool(true,  "Dealing Range EQ (50%)")
showRange = input.bool(false, "Tracked Swing High / Low")
showFlip  = input.bool(true,  "Bias Flip Labels")
showBg    = input.bool(false, "Background Tint")
showMulti = input.bool(true,  "Multi-Pair Bias Box")`;

  const copyCodeToClipboard = async () => {
    await navigator.clipboard.writeText(pineScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const salesHighlights = [
    {
      icon: <Layers size={22} className="text-[#F0B429]" />,
      title: "Mechanical Pivot Algorithm",
      desc: "Zero-repaint, strictly closed body-break swing pivot bias tracking. Flips only occur when a candle body-closes past previous higher-lows or lower-highs."
    },
    {
      icon: <Eye size={22} className="text-[#00D084]" />,
      title: "Real-Time Multi-Pair Screen Overlay",
      desc: "Locked to the upper right corner of your TradingView chart. Monitors XAUUSD, EURUSD, GBPUSD, NAS100, and more simultaneously from one single chart."
    },
    {
      icon: <Cpu size={22} className="text-blue-400" />,
      title: "Zero-Drift Price scale Plotting",
      desc: "By utilizing TradingView's native plot Scale mapping engine, your Invalidation, EQ (50% Range), and Swing levels remain perfectly anchored during drag & zoom."
    }
  ];

  return (
    <section className="relative overflow-hidden py-16 border-t border-[#1E1E38] bg-[#05050C]">
      {/* Decorative radial premium highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#F0B429]/8 blur-[100px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/3 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header Block */}
        <div className="mx-auto max-w-3xl text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-4 py-1.5 text-xs font-semibold text-[#F0B429]">
            <Sparkles size={13} />
            LIFETIME VALUE OFFER — BIAS DESK PRO
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            BIAS DESK PRO — <br />
            <span className="text-shimmer">The Ultimate Mechanical Structure Bias Engine</span>
          </h2>
          
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium">
            Stop guessing the trend. Lock in absolute algorithmic trend direction directly inside your TradingView charts. Designed for professional swing and intraday traders.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          
          {/* Left Column: Visual features */}
          <div className="space-y-8 min-w-0">
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-black text-white">Why Bias Desk Pro is a Core Asset</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
                The absolute biggest trading mistake is fighting the higher timeframe bias. Bias Desk Pro solves this by enforcing an uncompromising mathematical pivot rule system: No repainting, no opinion. Just mechanical body-break validations.
              </p>
            </div>

            <div className="space-y-4">
              {salesHighlights.map((hl, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveFocus(idx)}
                  className={`p-4 rounded-2xl border transition duration-300 cursor-pointer flex gap-4 items-start ${
                    activeFeature === idx 
                      ? "border-[#F0B429]/30 bg-[#F0B429]/5 gold-glow" 
                      : "border-[#1E1E38] bg-[#0A0A16]/50 hover:border-[#F0B429]/20"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">{hl.icon}</div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-white">{hl.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-medium">{hl.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Card className="p-6 border-[#F0B429]/30 bg-[#0F0F24]/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#F0B429]/5 to-transparent pointer-events-none" />
              <div className="relative text-center sm:text-left min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F0B429] bg-[#F0B429]/10 px-2 py-0.5 rounded">LIFETIME ACCESS</span>
                <div className="flex items-baseline gap-2 mt-2 justify-center sm:justify-start">
                  <span className="text-3xl sm:text-4xl font-black text-white">$149</span>
                  <span className="text-xs text-zinc-500 font-bold uppercase line-through">$399</span>
                  <span className="text-xs text-[#10b981] font-black uppercase tracking-wider">Save 60%</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 font-medium">One-time payment · Instant TradingView Access</p>
              </div>

              <a 
                href="/upgrade"
                className="w-full sm:w-auto gold-gradient px-6 py-3.5 rounded-xl text-xs font-black text-[#080810] flex items-center justify-center gap-2 transition duration-300 hover:shadow-[0_0_24px_rgba(240,180,41,0.45)] active:scale-[0.98] shrink-0"
              >
                <Coins size={14} /> Buy Lifetime Licence Now
              </a>
            </Card>
          </div>

          {/* Right Column: Code viewer */}
          <div className="min-w-0">
            <Card className="border-[#1E1E38] bg-[#070712] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[450px]">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F0B429]/2 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-[#1E1E38]/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F0B429]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  </div>
                  <span className="text-[10px] font-mono2 text-zinc-500 font-bold ml-2">bias_desk_pro.pine</span>
                </div>

                <button 
                  onClick={copyCodeToClipboard}
                  className="px-3 py-1.5 bg-[#16162C] border border-[#24243C] rounded-lg text-[10px] font-bold text-[#F0B429] hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  {copied ? "Copied" : "Copy Pine Script"}
                </button>
              </div>

              <div className="flex-1 font-mono2 text-[11px] leading-relaxed text-zinc-400 overflow-y-auto no-scrollbar space-y-2.5 pr-2 select-all">
                <p className="text-zinc-500 font-medium">// BIAS DESK PRO — PREMIUM MECHANICAL BIAS ENGINE</p>
                <p className="text-zinc-500 font-medium">// Exact Desk Rules • Professional Styling • Ready to Sell</p>
                <pre className="text-[#8b5cf6] bg-black/30 p-3 rounded-xl border border-white/[0.02] text-xs">
                  {pineScriptCode}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E1E38]/60 text-[9px] text-zinc-600 flex items-center gap-1.5">
                <Info size={12} />
                <span>Compatible with TradingView Pine Script v6. Standard license protection active.</span>
              </div>
            </Card>
          </div>

        </div>

      </div>
    </section>
  );
}
