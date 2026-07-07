"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type {
  BacktestModel,
  BacktestJournalTrade,
} from "@/lib/backtesting/journal";

export function TradeForm({
  model,
  existing,
  onCancel,
  onSave,
}: {
  model: BacktestModel;
  existing?: BacktestJournalTrade | null;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => void | Promise<void>;
}) {
  const rules = model.rules || [];
  const [side, setSide] = useState<"long" | "short">(
    existing?.side || "long"
  );
  const [tradeDate, setTradeDate] = useState(existing?.trade_date || "");
  const [price, setPrice] = useState(
    existing?.entry_price != null ? String(existing.entry_price) : ""
  );
  const [sl, setSl] = useState(
    existing?.stop_loss != null ? String(existing.stop_loss) : ""
  );
  const [target, setTarget] = useState(
    existing?.take_profit != null ? String(existing.take_profit) : ""
  );
  const [be, setBe] = useState(
    existing?.be != null ? String(existing.be) : ""
  );
  const [risk, setRisk] = useState(
    existing?.risk != null ? String(existing.risk) : ""
  );
  const [riskUnit, setRiskUnit] = useState<"currency" | "percent">(
    existing?.risk_unit || "currency"
  );
  const [ruleTicks, setRuleTicks] = useState<boolean[]>(
    existing?.rule_ticks && existing.rule_ticks.length === rules.length
      ? existing.rule_ticks
      : rules.map(() => false)
  );
  const [deviations, setDeviations] = useState(existing?.deviations || "");
  const [psychology, setPsychology] = useState(existing?.psychology || "");
  const [result, setResult] = useState(existing?.result || "");
  const [saving, setSaving] = useState(false);

  function toggleRule(i: number) {
    setRuleTicks(ruleTicks.map((v, idx) => (idx === i ? !v : v)));
  }
  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

  async function submit() {
    setSaving(true);
    try {
      await onSave({
        side,
        tradeDate: tradeDate || null,
        entryPrice: numOrNull(price),
        stopLoss: numOrNull(sl),
        takeProfit: numOrNull(target),
        be: numOrNull(be),
        risk: numOrNull(risk),
        riskUnit,
        ruleTicks,
        deviations: deviations.trim() || null,
        psychology: psychology.trim() || null,
        result: result || null,
      });
    } finally {
      setSaving(false);
    }
  }

  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#8080A0]";
  const inputCls =
    "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-3 text-sm text-white outline-none focus:border-[#F0B429]/50";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Date</label>
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Direction</label>
          <div className="grid grid-cols-2 gap-2">
            {(["long", "short"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold capitalize transition ${
                  side === s
                    ? s === "long"
                      ? "border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]"
                      : "border-[#FF4565]/40 bg-[#FF4565]/10 text-[#FF4565]"
                    : "border-[#1E1E38] bg-[#0D0D1A] text-zinc-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Price</label>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1.0850"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>SL</label>
          <input
            inputMode="decimal"
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            placeholder="1.0800"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Target</label>
          <input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="1.0950"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>BE</label>
          <input
            inputMode="decimal"
            value={be}
            onChange={(e) => setBe(e.target.value)}
            placeholder="1.0830"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Risk</label>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            placeholder="1.0"
            className="flex-1 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-3 text-sm text-white outline-none focus:border-[#F0B429]/50"
          />
          <div className="flex rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-1">
            {(["currency", "percent"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setRiskUnit(u)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  riskUnit === u
                    ? "bg-[#F0B429] text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {u === "currency" ? "$" : "%"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rules.length > 0 && (
        <div>
          <label className={labelCls}>Rule Checklist — tick what you followed</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {rules.map((rule, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleRule(i)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  ruleTicks[i]
                    ? "border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]"
                    : "border-[#1E1E38] bg-[#161628] text-[#A0A0C0] hover:text-white"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    ruleTicks[i]
                      ? "border-[#00D084] bg-[#00D084] text-black"
                      : "border-[#2E2E4D]"
                  }`}
                >
                  {ruleTicks[i] && <Check size={13} />}
                </span>
                <span className="whitespace-pre-wrap break-all">{rule}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Any change on this trade?</label>
          <textarea
            value={deviations}
            onChange={(e) => setDeviations(e.target.value)}
            rows={3}
            placeholder="What deviated from the plan?"
            className="w-full resize-none rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429]/50"
          />
        </div>
        <div>
          <label className={labelCls}>Psychology</label>
          <textarea
            value={psychology}
            onChange={(e) => setPsychology(e.target.value)}
            rows={3}
            placeholder="How did you feel? FOMO, patience, revenge?"
            className="w-full resize-none rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429]/50"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Result</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["win", "Win"],
            ["loss", "Loss"],
            ["be", "Breakeven"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setResult(val)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                result === val
                  ? val === "win"
                    ? "border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]"
                    : val === "loss"
                      ? "border-[#FF4565]/40 bg-[#FF4565]/10 text-[#FF4565]"
                      : "border-[#F0B429]/40 bg-[#F0B429]/10 text-[#F0B429]"
                  : "border-[#1E1E38] bg-[#0D0D1A] text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#F0B429] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#d99f1e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : existing ? (
            "Save Changes"
          ) : (
            "Save Trade"
          )}
        </button>
      </div>
    </div>
  );
}
