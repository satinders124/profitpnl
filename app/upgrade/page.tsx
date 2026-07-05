"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase-client";

export default function UpgradePage() {
  const { user, plan, planSource } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "cancelled") {
        showToast("Checkout cancelled. You can upgrade anytime when you are ready.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const isProPaid = plan === "Pro Plan" && planSource === "paid";
  const isOnTrial = plan === "Pro Plan" && planSource === "trial";

  const handleUpgrade = async (planType: "monthly" | "annual") => {
    if (!user) {
      showToast("Please login first to upgrade.");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          uid: user.id,
          email: user.email,
          billing: planType,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else if (response.status === 503) {
        showToast(data.error || "Payments coming soon — Stripe is being set up.");
      } else {
        showToast(data.error || "Could not start checkout. Please try again.");
      }
    } catch {
      showToast("Connection error. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Upgrade to Pro" subtitle="Unlock the Full Performance Engine">
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center gap-12 py-10 px-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0B429] text-black text-[10px] font-black uppercase tracking-widest mb-4">
            <Crown size={12} /> Elite Access
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
            Stop Guessing. <br />{" "}
            <span className="text-[#F0B429]">Start Scaling.</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* ── Free Plan Card ── */}
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
              <FeatureItem text="Prop Firm Auto-Sync" active={false} />
              <FeatureItem text="Verified P&L Certificates" active={false} />
            </div>
            <button
              className={`w-full py-4 rounded-xl border text-sm font-black transition-colors ${
                plan === "Free Plan"
                  ? "border-[#F0B429] text-[#F0B429] bg-[#F0B429]/10"
                  : "border-[#1E1E38] text-[#A0A0C0]"
              }`}
            >
              {plan === "Free Plan" ? "Current Plan" : "Downgrade to Free"}
            </button>
          </Card>

          {/* ── Pro Plan Card ── */}
          <Card className="p-8 bg-[#111120] border-[#F0B429] flex flex-col relative overflow-hidden shadow-[0_0_30px_rgba(240,180,41,0.15)]">
            <div className="absolute top-0 right-0 bg-[#F0B429] text-black text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10">
              Most Popular
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <Zap size={20} className="text-[#F0B429]" /> ProfitPnL Pro
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$19 USD</span>
                <span className="text-[#A0A0C0] text-sm">/month</span>
              </div>
              <p className="text-[#5A5A80] text-xs mt-1">
                or <span className="text-[#A0A0C0]">$190 USD/year</span> (save 17%)
              </p>
            </div>
            <div className="flex-1 space-y-4 mb-8">
              <FeatureItem text="Unlimited Accounts" active />
              <FeatureItem text="Unlimited Trade Logs" active />
              <FeatureItem text="Elite Psychology Terminal" active />
              <FeatureItem text="Unlimited AI Coach" active />
              <FeatureItem text="Advanced Analytics" active />
              <FeatureItem text="Prop Firm Auto-Sync" active />
              <FeatureItem text="Verified P&L Certificates" active />
            </div>

            <div className="space-y-3">
              {/* Monthly button */}
              <button
                onClick={() => handleUpgrade("monthly")}
                disabled={loading || isProPaid}
                className="w-full py-4 rounded-xl gold-gradient text-[#080810] font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Rocket size={18} />
                )}
                {isProPaid ? "Already Pro" : isOnTrial ? "Upgrade to Keep Pro — $19 USD/mo" : "Upgrade to Pro — $19 USD/mo"}
              </button>

              {/* Annual button */}
              <button
                onClick={() => handleUpgrade("annual")}
                disabled={loading || isProPaid}
                className="w-full py-3 rounded-xl border border-[#F0B429]/40 text-[#F0B429] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#F0B429]/10 disabled:opacity-50 transition-all"
              >
                <Clock size={14} />
                {isProPaid ? "Already Pro" : isOnTrial ? "Annual — Keep Pro $190 USD/yr" : "Annual — $190 USD/yr (Save 17%)"}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Toast Notification ─── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#12121A] border border-[#F0B429]/30 rounded-xl shadow-2xl shadow-black/50">
            <div className="w-8 h-8 rounded-lg bg-[#F0B429]/15 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-[#F0B429]" />
            </div>
            <p className="text-white text-sm font-medium">{toast}</p>
            <button
              onClick={() => setToast(null)}
              className="text-zinc-500 hover:text-white transition-colors ml-2 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FeatureItem({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {active ? (
        <Check size={14} className="text-[#00D084] shrink-0" />
      ) : (
        <X size={14} className="text-red-500 shrink-0" />
      )}
      <span
        className={`${active ? "text-[#F0F0FF]" : "text-[#5A5A80] line-through"}`}
      >
        {text}
      </span>
    </div>
  );
}


