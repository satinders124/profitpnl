"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { BacktestModel } from "@/lib/backtesting/journal";

export type ModelFormPayload = {
  name: string;
  market: string;
  timeframe: string;
  symbol: string;
  notes: string;
  rules: string[];
};

export function ModelForm({
  existing,
  onCancel,
  onSave,
}: {
  existing: BacktestModel | null;
  onCancel: () => void;
  onSave: (payload: ModelFormPayload) => void;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [market, setMarket] = useState(existing?.market || "");
  const [timeframe, setTimeframe] = useState(existing?.timeframe || "");
  const [symbol, setSymbol] = useState(existing?.symbol || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [rules, setRules] = useState<string[]>(existing?.rules || []);
  const [ruleDraft, setRuleDraft] = useState("");

  function addRule() {
    const v = ruleDraft.trim();
    if (!v) return;
    setRules([...rules, v]);
    setRuleDraft("");
  }
  function removeRule(i: number) {
    setRules(rules.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      market: market.trim(),
      timeframe: timeframe.trim(),
      symbol: symbol.trim(),
      notes: notes.trim(),
      rules,
    });
  }

  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8080A0]";
  const inputCls =
    "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-3 text-sm text-white outline-none focus:border-[#F0B429]/50";

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Strategy Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. BTC 15m Breakout"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Market</label>
          <input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Crypto"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Timeframe</label>
          <input
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            placeholder="15m"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTCUSDT"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Rules Checklist</label>
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-[#1E1E38] bg-[#161628] px-3 py-2"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00D084]" />
              <span className="flex-1 whitespace-pre-wrap break-all text-sm text-[#A0A0C0]">
                {rule}
              </span>
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-zinc-500 hover:text-[#FF4565]"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={ruleDraft}
              onChange={(e) => setRuleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRule();
                }
              }}
              placeholder="Add a rule (press Enter)"
              className="flex-1 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none focus:border-[#F0B429]/50"
            />
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-4 py-2.5 text-sm font-semibold text-[#F0B429]"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes / Thesis</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Describe the edge, invalidation, risk protocol..."
          className="w-full resize-none rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429]/50"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={onCancel}
          className="rounded-xl border border-[#282838] bg-[#181824] px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-[#202030]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-xl bg-[#F0B429] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#d99f1e] disabled:opacity-40"
        >
          {existing ? "Save Changes" : "Create Model"}
        </button>
      </div>
    </div>
  );
}
