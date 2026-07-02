"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Check, X, Zap, Crown, ShieldCheck, Rocket, } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function UpgradePage() {
  const { user, plan } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planType: "monthly" | "annual") => {
    if (!user) return alert("Please login first");
    setLoading(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          billing: planType,
        }),
      });

      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else alert("Checkout error: " + (data.error || "Unknown error"));
    } catch (error) {
      alert("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Upgrade to Pro" subtitle="Unlock the Full Performance Engine">
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center gap-12 py-10 px-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-gradient text-black text-[10px] font-black uppercase tracking-widest mb-4">
            <Crown size={12} /> Elite Access
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
            Stop Guessing. <br/> <span className="text-[#F0B429]">Start Scaling.</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <Card className="p-8 bg-[#0D0D1A]/40 border-[#1E1E38] flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black text-white mb-2">Essential</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-[#5A5A80] text-sm">/month</span>
              </div>
            </div>
            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="1 Trading Account" active={true} />
              <FeatureItem text="50 Trade Logs" active={true} />
              <FeatureItem text="Basic Psychology Journal" active={true} />
              <FeatureItem text="Unlimited AI Coach" active={false} />
              <FeatureItem text="Advanced Analytics" active={false} />
            </div>
            <button className={`w-full py-4 rounded-xl border text-sm font-black transition-colors ${plan === "Free Plan" ? "border-[#F0B429] text-[#F0B429] bg-[#F0B429]/10" : "border-[#1E1E38] text-[#A0A0C0]"}`}>
              {plan === "Free Plan" ? "Current Plan" : "Downgrade to Free"}
            </button>
          </Card>

          <Card className="p-8 bg-[#111120] border-[#F0B429] flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(240,180,41,0.15)]">
            <div className="absolute top-0 right-0 bg-[#F0B429] text-black text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10">
              Most Popular
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <Zap size={20} className="text-[#F0B429]" /> ProfitPnL Pro
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$19</span>
                <span className="text-[#A0A0C0] text-sm">/month</span>
              </div>
            </div>
            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="Unlimited Accounts" active />
              <FeatureItem text="Unlimited Trade Logs" active />
              <FeatureItem text="Elite Psychology Terminal" active />
              <FeatureItem text="Unlimited AI Coach" active />
              <FeatureItem text="Advanced Analytics" active />
            </div>
            <button 
              onClick={() => handleUpgrade("monthly")}
              disabled={loading || plan === "Pro Plan"}
              className="w-full py-4 rounded-xl gold-gradient text-[#080810] font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
              {plan === "Pro Plan" ? "Already Pro" : "Upgrade to Pro Now"}
            </button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function FeatureItem({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {active ? <Check size={14} className="text-[#00D084] shrink-0" /> : <X size={14} className="text-red-500 shrink-0" />}
      <span className={`${active ? "text-[#F0F0FF]" : "text-[#5A5A80] line-through"}`}>{text}</span>
    </div>
  );
}

function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}