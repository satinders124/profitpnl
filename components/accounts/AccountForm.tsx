"use client";

import { saveAccount } from "@/lib/firestore";
import { TradingAccount } from "@/types/account";
import { useState } from "react";

const accountTypes = ["Prop", "Funded", "Evaluation", "Personal", "Demo"];
const statuses = ["Active", "Passed", "Failed", "Paused"];

type AccountFormProps = {
  uid: string;
  existing?: TradingAccount | null;
  onSaved: () => void;
  onCancel: () => void;
};

export function AccountForm({
  uid,
  existing,
  onSaved,
  onCancel,
}: AccountFormProps) {
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

  function update<K extends keyof TradingAccount>(
    key: K,
    value: TradingAccount[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name) return;

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Account Name">
          <input
            value={String(form.name || "")}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="FTMO 100K"
            required
          />
        </Field>

        <Field label="Firm / Broker">
          <input
            value={String(form.firm || "")}
            onChange={(e) => update("firm", e.target.value)}
            className={inputClass}
            placeholder="FTMO, FundingPips, Personal..."
          />
        </Field>

        <Field label="Type">
          <select
            value={String(form.type || "")}
            onChange={(e) => update("type", e.target.value)}
            className={inputClass}
          >
            {accountTypes.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            value={String(form.status || "")}
            onChange={(e) => update("status", e.target.value)}
            className={inputClass}
          >
            {statuses.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Account Size">
          <input
            value={String(form.size || "")}
            onChange={(e) => update("size", e.target.value)}
            className={inputClass}
            placeholder="100000"
          />
        </Field>

        <Field label="Starting Balance">
          <input
            value={String(form.startingBalance || "")}
            onChange={(e) => update("startingBalance", e.target.value)}
            className={inputClass}
            placeholder="100000"
          />
        </Field>

        <Field label="Current Balance">
          <input
            value={String(form.currentBalance || "")}
            onChange={(e) => update("currentBalance", e.target.value)}
            className={inputClass}
            placeholder="Optional"
          />
        </Field>

        <Field label="Profit Target %">
          <input
            value={String(form.profitTarget || "")}
            onChange={(e) => update("profitTarget", e.target.value)}
            className={inputClass}
            placeholder="10"
          />
        </Field>

        <Field label="Max Drawdown %">
          <input
            value={String(form.maxDD || "")}
            onChange={(e) => update("maxDD", e.target.value)}
            className={inputClass}
            placeholder="10"
          />
        </Field>

        <Field label="Daily Loss %">
          <input
            value={String(form.dailyLoss || "")}
            onChange={(e) => update("dailyLoss", e.target.value)}
            className={inputClass}
            placeholder="5"
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={() => update("trailingDD", !form.trailingDD)}
        className={[
          "w-full rounded-xl border px-4 py-3 text-sm font-black",
          form.trailingDD
            ? "border-[#F0B429]/25 bg-[#F0B429]/10 text-[#F0B429]"
            : "border-[#1E1E38] bg-[#0D0D1A] text-[#A0A0C0]",
        ].join(" ")}
      >
        {form.trailingDD ? "Trailing Drawdown Enabled" : "Static Drawdown"}
      </button>

      <Field label="Notes">
        <textarea
          value={String(form.notes || "")}
          onChange={(e) => update("notes", e.target.value)}
          className={`${inputClass} min-h-24 resize-y`}
          placeholder="Rules, payout notes, restrictions..."
        />
      </Field>

      <div className="flex gap-3 border-t border-[#1E1E38] pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-[#1E1E38] px-4 py-3 font-black text-[#A0A0C0]"
        >
          Cancel
        </button>

        <button
          disabled={saving}
          className="gold-gradient flex-[2] rounded-xl px-4 py-3 font-black text-[#080810] disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : existing
              ? "Save Account"
              : "Create Account"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold text-[#F0F0FF] outline-none focus:border-[#F0B429]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
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