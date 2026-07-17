"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Brain, Clock, ShieldCheck, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function FeatureAnnouncementBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already acknowledged this premium release popup
    const acknowledged = localStorage.getItem("acknowledged_release_v2");
    if (!acknowledged) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("acknowledged_release_v2", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="absolute inset-0" onClick={handleDismiss} />
        
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 280 }}
          className="relative w-full max-w-xl bg-[#0F0F1E] border border-[#24243C] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {/* Glowing background */}
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#F0B429]/10 blur-2xl pointer-events-none" />

          {/* Heading */}
          <div className="flex items-center gap-3.5 border-b border-[#1E1E38] pb-4 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#F0B429]/10 border border-[#F0B429]/25 flex items-center justify-center text-[#F0B429]">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F0B429] bg-[#F0B429]/10 px-2 py-0.5 rounded">NEW RELEASE V2.0</span>
              <h3 className="text-lg font-black text-white mt-1.5 tracking-tight">AI Risk-Guard & Live Cockpit is Live!</h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
            We have completely overhauled your trading experience with high-end, military-grade risk-interception features. Here is what is active in your terminal now:
          </p>

          {/* Features bullet list */}
          <div className="space-y-4 mb-8">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase">Active Session Clock-In</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Define your drawdown limit and profit target before you start trading. Bypasses standard dashboards for a full cockpit view.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-[#F0B429]/10 border border-[#F0B429]/25 flex items-center justify-center text-[#F0B429] shrink-0 mt-0.5">
                <Brain size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase">Playbook Rules Checklist Verification</h4>
                <p className="text-xs text-zinc-400 mt-0.5">When taking a running trade, the app dynamically pulls your strategy rules and demands explicit checklist confirmations before execution.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-[#00D084]/10 border border-[#00D084]/25 flex items-center justify-center text-[#00D084] shrink-0 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase">AI Humanized Closeouts</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Receive incredibly detailed, supportive, and analytical behavioral paragraph summaries generated directly by our AI engine.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full gold-gradient py-3 rounded-xl text-[#080810] font-black text-xs flex items-center justify-center gap-2 transition duration-300 active:scale-[0.98] shadow-md shadow-[#F0B429]/10"
          >
            <Check size={15} /> Acknowledge and Enter Cockpit
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default FeatureAnnouncementBanner;
