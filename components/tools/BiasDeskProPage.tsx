"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase-client";
import { 
  Sparkles, Layers, Eye, Cpu, Coins, Info, Check, Copy, ChevronDown, ChevronUp, Star, Award, ShieldAlert, Zap, Heart
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function BiasDeskProPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeHighlight, setActiveHighlight] = useState(0);

  const highlights = [
    {
      icon: <Layers className="text-[#F0B429]" size={22} />,
      title: "Mechanical Pivot Algorithm",
      desc: "Zero-repaint, strictly closed body-break swing pivot bias tracking. Flips only occur when a candle body-closes past previous higher-lows or lower-highs."
    },
    {
      icon: <Eye className="text-[#10b981]" size={22} />,
      title: "Real-Time Multi-Pair Screen Overlay",
      desc: "Locked to the upper right corner of your TradingView chart. Monitors XAUUSD, EURUSD, GBPUSD, NAS100, and more simultaneously from one single chart."
    },
    {
      icon: <Cpu className="text-blue-400" size={22} />,
      title: "Zero-Drift Price scale Plotting",
      desc: "By utilizing TradingView's native plot Scale mapping engine, your Invalidation, EQ (50% Range), and Swing levels remain perfectly anchored during drag & zoom."
    }
  ];

  const faqs = [
    {
      q: "Does this indicator repaint?",
      a: "Absolutely not. True to mechanical rules, bias flips register ONLY when the bias timeframe candle body-closes through previous highs or lows. No retrospective level shifts."
    },
    {
      q: "How is the lifetime script license delivered?",
      a: "Instant access. Upon secure lifetime checkout, you will receive invitation access to the private TradingView script on your TradingView profile. Simply add it to your favorites."
    },
    {
      q: "Which timeframes and assets are supported?",
      a: "It operates flawlessly on any chart timeframe (from 1-minute scalping to 1-day swing trading) and compiles live data feeds for Forex, Crypto, Indices, and Futures."
    }
  ];

  return (
    <div className="min-h-screen bg-[#030307] text-[#f3f4f6] antialiased select-none relative overflow-hidden font-sans">
      
      {/* Decorative premium glows */}
      <div className="trading-grid absolute inset-0 opacity-10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#F0B429]/8 blur-[130px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-20 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/3 blur-[120px] pointer-events-none" />

      {/* Main Content container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 relative z-10 space-y-24">
        
        {/* Header Block */}
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-4 py-1.5 text-xs font-semibold text-[#F0B429] animate-bounce">
            <Sparkles size={13} />
            LIFETIME INDICATOR ACCESS
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
            BIAS DESK PRO <br />
            <span className="text-shimmer">The Mechanical Trend Bias Engine</span>
          </h1>
          
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium">
            Lock absolute algorithmic trend direction directly inside your TradingView charts. Built by professional traders to eliminate cognitive trend doubt and protect your bias execution.
          </p>
        </div>

        {/* Pricing / CTA Section (Bespoke premium pricing card) */}
        <div className="max-w-3xl mx-auto">
          <Card className="border-spin relative p-8 sm:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 rounded-3xl">
            <div className="space-y-4 text-center md:text-left min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F0B429] bg-[#F0B429]/10 px-3 py-1 rounded-full">LIFETIME ACCESS PRO LICENCE</span>
              <div className="flex items-baseline gap-2 mt-2 justify-center md:justify-start">
                <span className="text-4xl sm:text-5xl font-black text-white">$149</span>
                <span className="text-xs text-zinc-500 font-bold uppercase line-through">$399</span>
                <span className="text-xs text-[#10b981] font-black uppercase tracking-wider">Save 60%</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">No monthly fees · Unlimited charts · Complete TradingView script profile activation</p>
            </div>

            <button 
              onClick={async () => {
                try {
                  const { data: { session } } = await createClient().auth.getSession();
                  const res = await fetch("/api/payments/checkout-indicator", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
                    },
                  });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    alert(data.error || "Failed to launch Stripe checkout");
                  }
                } catch {
                  alert("Connection error launching checkout.");
                }
              }}
              className="w-full md:w-auto gold-gradient px-8 py-4 rounded-2xl text-xs font-black text-[#080810] flex items-center justify-center gap-2 transition duration-300 hover:shadow-[0_0_35px_rgba(240,180,41,0.55)] active:scale-[0.98] shrink-0"
            >
              <Coins size={14} /> Buy Lifetime Licence Now
            </button>
          </Card>
        </div>

        {/* Features Workspace Grid */}
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center pt-8">
          
          {/* Left Column: Visual features */}
          <div className="space-y-8 min-w-0">
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white">Algorithmic Structure Protection</h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                The absolute biggest mistake in trading is fighting the higher timeframe bias. Bias Desk Pro solves this by enforcing uncompromising mechanical pivot rules:
              </p>
            </div>

            <div className="space-y-4">
              {highlights.map((hl, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveHighlight(idx)}
                  className={`p-4 rounded-2xl border transition duration-300 cursor-pointer flex gap-4 items-start ${
                    activeHighlight === idx 
                      ? "border-[#F0B429]/30 bg-[#F0B429]/5 gold-glow" 
                      : "border-[#1E1E38] bg-[#0D0D1A]/50 hover:border-[#F0B429]/20"
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
          </div>

          {/* Right Column: Premium Pitch Terminal Card */}
          <div className="min-w-0">
            <Card className="border-[#1E1E38] bg-[#070712] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[450px]">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F0B429]/2 to-transparent pointer-events-none" />
              
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F0B429] bg-[#F0B429]/10 px-2 py-0.5 rounded">THE DESK RULES</span>
                <h4 className="text-lg font-black text-white leading-tight">Mechanical Execution — Strictly Enforced</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bias Desk Pro continuously scans higher timeframe swing levels (defaulting to the 4H). It computes the exact critical invalidation level (the most recent higher-low or lower-high) and plots a zero-drift horizontal reference line. 
                </p>
                
                <div className="p-4 bg-[#111124] border border-[#1E1E38] rounded-xl space-y-1 text-[#F0B429] font-semibold">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">📝 UNCOMPROMISING BIAS LAWS:</p>
                  <p className="text-[11px] text-zinc-300">1. Flips ONLY occur when a candle body-closes past the level.</p>
                  <p className="text-[11px] text-zinc-300">2. Wicks do NOT trigger trend flips. Repainting is impossible.</p>
                  <p className="text-[11px] text-zinc-300">3. Keeps tables and ranges screen-locked in the corners.</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E1E38]/60 text-[9px] text-zinc-600 flex items-center gap-1.5">
                <Info size={12} />
                <span>Private access invitation sent directly to your TradingView profile upon purchase.</span>
              </div>
            </Card>
          </div>

        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto space-y-8 pt-8">
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-black text-white">License Frequently Asked Questions</h3>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = activeFaq === i;
              return (
                <div
                  key={f.q}
                  className={`overflow-hidden rounded-xl border backdrop-blur transition-colors ${
                    isOpen ? "border-[#F0B429]/40 bg-[#0E0E1F]" : "border-[#1E1E38] bg-[#0A0A16]/60 hover:border-[#F0B429]/25"
                  }`}
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className={`text-sm font-semibold transition-colors ${isOpen ? "text-[#F0B429]" : "text-white"}`}>{f.q}</span>
                    <span className={`text-sm ${isOpen ? "text-[#F0B429]" : "text-zinc-500"}`}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <p className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-zinc-400">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
export { BiasDeskProPage };
