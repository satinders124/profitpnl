"use client";

import { useState } from "react";
import { saveAccount, getAccounts } from "@/lib/db";
import { TradingAccount } from "@/types/account";
import { useAuth } from "@/components/providers/AuthProvider";
import { Wallet, Target, ShieldAlert, FileText, Globe, TrendingUp } from "lucide-react";

const accountTypes = ["Prop", "Funded", "Evaluation", "Personal", "Demo"];
const statuses = ["Active", "Passed", "Failed", "Paused"];

type AccountFormProps = {
  uid: string;
  existing?: TradingAccount | null;
  onSaved: () => void;
  onCancel: () => void;
};

export function AccountForm({ uid, existing, onSaved, onCancel }: AccountFormProps) {
  const { plan, planSource } = useAuth();
  
  const [form, setForm] = useState<Partial<TradingAccount>>({
    name: existing?.name || "",
    firm: existing?.firm || "",
    type: existing?.type || "Prop",
    size: existing?.size || "",
    startingBalance: existing?.startingBalance || existing?.size || "",
    currentBalance: existing?.currentBalance || "",
    maxDD: existing?.maxDD || 10,
    dailyLoss: existing?.dailyLoss || "",
    profitTarget: existing?.profitTarget || "",
    trailingDD: existing?.trailingDD || false,
    status: existing?.status || "Active",
    notes: existing?.notes || "",
  });

  const [saving, setSaving] = useState(false);

  function update<K extends keyof TradingAccount>(key: K, value: TradingAccount[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;

    const isFreeOrTrial = plan === "Free Plan" || planSource === "trial";
    if (isFreeOrTrial && !existing) {
      try {
        const currentAccounts = await getAccounts(uid);
        if (currentAccounts.length >= 1) {
          alert("Free & trial members are limited to 1 trading account. Please upgrade to Pro to add more accounts.");
          return;
        }
      } catch (err) { console.error(err); }
    }

    setSaving(true);
    try {
      await saveAccount(uid, {
        ...form,
        id: existing?.id,
        size: cleanNumber(form.size),
        startingBalance: cleanNumber(form.startingBalance),
        currentBalance: cleanNumber(form.currentBalance),
        maxDD: cleanNumber(form.maxDD),
        dailyLoss: cleanNumber(form.dailyLoss),
        profitTarget: cleanNumber(form.profitTarget),
      });
      onSaved();
    } catch (error) {
      alert("Failed to save account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8 py-2">
      {/* SECTION 1: IDENTITY */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-[#F0B429]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Account Identity</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-[#F0B429]/30 to-transparent ml-3" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Account Name" icon={<Wallet size={14} />}>
            <input value={String(form.name || "")} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="FTMO 100K" required />
          </Field>
          <Field label="Firm / Broker" icon={<Globe size={14} />}>
            <input value={String(form.firm || "")} onChange={(e) => update("firm", e.target.value)} className={inputClass} placeholder="FTMO, FundingPips..." />
          </Field>
          <Field label="Account Type" icon={<Target size={14} />}>
            <select value={String(form.type || "")} onChange={(e) => update("type", e.target.value)} className={inputClass}>
              {accountTypes.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Status" icon={<TrendingUp size={14} />}>
            <select value={String(form.status || "")} onChange={(e) => update("status", e.target.value)} className={inputClass}>
              {statuses.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* SECTION 2: CAPITAL & TARGETS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#F0B429]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Capital & Targets</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-[#F0B429]/30 to-transparent ml-3" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Account Size" icon={<Wallet size={14} />}>
            <input value={String(form.size || "")} onChange={(e) => update("size", e.target.value)} className={inputClass} placeholder="100000" />
          </Field>
          <Field label="Starting Balance" icon={<TrendingUp size={14} />}>
            <input value={String(form.startingBalance || "")} onChange={(e) => update("startingBalance", e.target.value)} className={inputClass} placeholder="100000" />
          </Field>
          <Field label="Current Balance" icon={<TrendingUp size={14} />}>
            <input value={String(form.currentBalance || "")} onChange={(e) => update("currentBalance", e.target.value)} className={inputClass} placeholder="Optional" />
          </Field>
          <Field label="Profit Target %" icon={<Target size={14} />}>
            <input value={String(form.profitTarget || "")} onChange={(e) => update("profitTarget", e.target.value)} className={inputClass} placeholder="10" />
          </Field>
        </div>
      </section>

      {/* SECTION 3: RISK PROFILE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={16} className="text-[#F0B429]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Risk Profile</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-[#F0B429]/30 to-transparent ml-3" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Max Drawdown %" icon={<ShieldAlert size={14} />}>
            <input value={String(form.maxDD || "")} onChange={(e) => update("maxDD", e.target.value)} className={inputClass} placeholder="10" />
          </Field>
          <Field label="Daily Loss %" icon={<ShieldAlert size={14} />}>
            <input value={String(form.dailyLoss || "")} onChange={(e) => update("dailyLoss", e.target.value)} className={inputClass} placeholder="5" />
          </Field>
        </div>

        <div className="p-4 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A]/50 flex items-center justify-between transition-all hover:border-[#F0B429]/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${form.trailingDD ? "bg-[#F0B429] text-black" : "bg-[#1E1E38] text-[#A0A0C0]"}`}>
               <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-sm font-black text-white">Trailing Drawdown</p>
              <p className="text-[10px] text-[#5A5A80]">Automatic balance-based stop loss</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update("trailingDD", !form.trailingDD)}
            className={`w-12 h-6 rounded-full transition-all relative ${form.trailingDD ? "bg-[#F0B429]" : "bg-[#1E1E38]"}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.trailingDD ? "left-7" : "left-1"}`} />
          </button>
        </div>

        <Field label="Account Notes" icon={<FileText size={14} />}>
          <textarea
            value={String(form.notes || "")}
            onChange={(e) => update("notes", e.target.value)}
            className={`${inputClass} min-h-24 resize-none`}
            placeholder="Key rules, payout dates, or specific restrictions..."
          />
        </Field>
      </section>

      <div className="flex gap-3 pt-6 border-t border-[#1E1E38]">
        <button type="button" onClick={onCancel} className="flex-1 py-4 rounded-2xl border border-[#1E1E38] text-sm font-black text-[#A0A0C0] hover:bg-[#1E1E38]/30 transition-all">
          Cancel
        </button>
        <button disabled={saving} className="flex-[2] py-4 rounded-2xl gold-gradient text-[#080810] font-black text-sm transition-transform active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(240,180,41,0.3)]">
          {saving ? "Processing..." : existing ? "Update Account" : "Create Account"}
        </button>
      </div>
    </form>
  );
}

const inputClass = "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold text-[#F0F0FF] outline-none focus:border-[#F0B429] focus:ring-1 focus:ring-[#F0B429]/50 transition-all";

function Field({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">
        {icon && <span className="text-[#F0B429]">{icon}</span>}
        {label}
      </div>
      {children}
    </label>
  );
}

function cleanNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  return Number.isFinite(num) ? num : "";
}