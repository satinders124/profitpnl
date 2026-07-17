"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { saveAccount, savePlaybookSetup, updateProfile } from "@/lib/db";
import { Brain, CheckCircle2, Loader2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

const markets = ["Forex", "Futures", "Crypto", "Stocks", "Options", "Indices"];
const problems = ["FOMO", "Revenge trading", "Overtrading", "Fear", "Inconsistency", "Poor risk control"];
const sessions = ["Asia", "London", "New York", "London + NY", "Any"];
const goals = ["Pass prop firm", "Become consistent", "Stop revenge trading", "Track performance", "Build a playbook"];

function n(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    market: "Futures",
    accountType: "Evaluation",
    accountSize: "50000",
    riskPerTrade: "0.5",
    dailyLoss: "4",
    maxDrawdown: "6",
    profitTarget: "8",
    problem: "FOMO",
    session: "London + NY",
    goal: "Pass prop firm",
  });

  if (!user) return null;

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        active_broker: form.market,
        default_risk_percentage: n(form.riskPerTrade, 0.5),
        daily_loss_limit: n(form.dailyLoss, 4),
        max_drawdown_limit: n(form.maxDrawdown, 6),
        daily_profit_target: n(form.profitTarget, 8),
        psychology_tags: [form.problem],
      });

      await saveAccount(user.id, {
        name: `${form.market} ${Number(form.accountSize).toLocaleString("en-US")} ${form.accountType}`,
        firm: form.goal === "Pass prop firm" ? "Prop Firm" : form.market,
        type: form.accountType,
        status: "Active",
        size: n(form.accountSize, 50000),
        startingBalance: n(form.accountSize, 50000),
        currentBalance: n(form.accountSize, 50000),
        dailyLoss: n(form.dailyLoss, 4),
        maxDD: n(form.maxDrawdown, 6),
        profitTarget: n(form.profitTarget, 8),
        notes: `Created by onboarding. Primary goal: ${form.goal}. Main psychology focus: ${form.problem}. Preferred session: ${form.session}.`,
      });

      await savePlaybookSetup(user.id, {
        name: `${form.session} A+ Setup`,
        status: "Active",
        market: form.market,
        timeframe: "15m / 1h",
        description: `Starter playbook generated from onboarding. Goal: ${form.goal}. Main risk: ${form.problem}.`,
        entryModel: "Wait for a clean setup, confirmation, and planned invalidation before entry.",
        invalidation: "No trade if emotional, late, oversized, or outside planned session.",
        targetModel: "Take profit only when planned R:R is available.",
        riskRule: `Risk ${form.riskPerTrade}% or less per trade. Stop if daily loss limit is threatened.`,
        rules: [
          "Trade only during preferred session.",
          "Risk is defined before entry.",
          "No revenge entries after a loss.",
          "Skip the setup if entry is late or unclear.",
        ],
        mistakesToAvoid: [form.problem, "Oversizing", "Moving stop loss"],
        tags: [form.market, form.session, form.goal],
      });

      router.push("/daily-plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Onboarding" subtitle="Configure ProfitPnL around your trading style.">
      <div className="mx-auto max-w-4xl space-y-7 pb-24">
        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
          <div className="relative p-6 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><Sparkles size={12} /> ProfitPnL Setup Wizard</div>
            <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Build your trading OS</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">Answer a few questions and ProfitPnL will create your first account, risk profile, starter playbook, and daily plan baseline.</p>
          </div>
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-6">
          <div className="mb-6 flex items-center justify-between">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`h-2 flex-1 rounded-full ${item <= step ? "bg-[#F0B429]" : "bg-[#1E1E38]"} ${item > 0 ? "ml-3" : ""}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-white"><TrendingUp className="text-[#F0B429]" /> Market Profile</h2>
              <ChoiceGrid label="What do you trade?" value={form.market} options={markets} onChange={(value) => update("market", value)} />
              <ChoiceGrid label="Main goal" value={form.goal} options={goals} onChange={(value) => update("goal", value)} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-white"><ShieldCheck className="text-[#F0B429]" /> Account & Risk</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account Type" value={form.accountType} onChange={(value) => update("accountType", value)} />
                <Field label="Account Size" value={form.accountSize} onChange={(value) => update("accountSize", value)} />
                <Field label="Risk Per Trade %" value={form.riskPerTrade} onChange={(value) => update("riskPerTrade", value)} />
                <Field label="Daily Loss %" value={form.dailyLoss} onChange={(value) => update("dailyLoss", value)} />
                <Field label="Max Drawdown %" value={form.maxDrawdown} onChange={(value) => update("maxDrawdown", value)} />
                <Field label="Profit Target %" value={form.profitTarget} onChange={(value) => update("profitTarget", value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-xl font-black text-white"><Brain className="text-[#F0B429]" /> Psychology Baseline</h2>
              <ChoiceGrid label="Biggest trading problem" value={form.problem} options={problems} onChange={(value) => update("problem", value)} />
              <ChoiceGrid label="Preferred trading session" value={form.session} options={sessions} onChange={(value) => update("session", value)} />
            </div>
          )}

          <div className="mt-8 flex gap-3 border-t border-[#1E1E38] pt-5">
            <button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving} className="flex-1 rounded-2xl border border-[#1E1E38] px-5 py-3 text-sm font-black text-[#A0A0C0] disabled:opacity-40">Back</button>
            {step < 2 ? (
              <button onClick={() => setStep((current) => Math.min(2, current + 1))} className="gold-gradient flex-[2] rounded-2xl px-5 py-3 text-sm font-black text-[#080810]">Continue</button>
            ) : (
              <button onClick={finish} disabled={saving} className="gold-gradient flex-[2] rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-60">
                {saving ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Creating...</span> : <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} /> Finish Setup</span>}
              </button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ChoiceGrid({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <button key={option} onClick={() => onChange(option)} className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${value === option ? "border-[#F0B429]/40 bg-[#F0B429]/10 text-[#F0B429]" : "border-[#1E1E38] bg-[#080810] text-zinc-300 hover:border-[#F0B429]/30"}`}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9A-Za-z ._-]/g, ""))} className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-black text-white outline-none focus:border-[#F0B429]" />
    </label>
  );
}
