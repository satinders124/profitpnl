"use client";

import { saveTrade } from "@/lib/db";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import { Trade } from "@/types/trade";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useNotificationCoPilot } from "@/components/providers/NotificationProvider";

const instruments = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "NAS100",
  "US30",
  "BTC",
  "ETH",
  "Other",
];

const sessions = [
  "Sydney",
  "Tokyo",
  "London",
  "New York",
  "London/NY Overlap",
  "Asian Kill Zone",
  "London Kill Zone",
  "NY Kill Zone",
];

const timeframes = ["1M", "3M", "5M", "15M", "30M", "1H", "4H", "1D"];

const emotions = [
  "Disciplined",
  "Calm",
  "Patient",
  "Confident",
  "Hesitant",
  "FOMO",
  "Anxious",
  "Overconfident",
  "Revenge",
  "Frustrated",
  "Neutral",
];

const mistakes = [
  "",
  "FOMO Entry",
  "Late Entry",
  "Early Exit",
  "Moved Stop",
  "No Confirmation",
  "Revenge Trade",
  "Overtrading",
  "Poor R:R",
  "Broke Rules",
  "None",
];

type TradeFormProps = {
  uid: string;
  existing?: Trade | null;
  accounts: TradingAccount[];
  playbook: PlaybookSetup[];
  strategiesFromTrades: string[];
  onSaved: () => void;
  onCancel: () => void;
};

export function TradeForm({
  uid,
  existing,
  accounts,
  playbook,
  strategiesFromTrades,
  onSaved,
  onCancel,
}: TradeFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const strategyOptions = uniqueClean([
    ...playbook.map((p) => p.name),
    ...strategiesFromTrades,
    existing?.setup,
  ]);

  const [form, setForm] = useState<Partial<Trade>>({
    date: existing?.date || today,
    account: existing?.account || "",
    instrument: existing?.instrument || "XAUUSD",
    direction: existing?.direction || "LONG",
    setup: existing?.setup || "",
    session: existing?.session || "New York",
    timeframe: existing?.timeframe || "15M",
    emotion: existing?.emotion || "Disciplined",
    entry: existing?.entry || "",
    sl: existing?.sl || "",
    tp: existing?.tp || "",
    rr: existing?.rr || "",
    result: existing?.result ?? "",
    pnl: existing?.pnl ?? "",
    notes: existing?.notes || "",
    tags: existing?.tags || "",
    chartUrl: existing?.chartUrl || "",
    time: existing?.time || "",
    reviewed: existing?.reviewed || false,
    executionRating: existing?.executionRating || "",
    mistake: existing?.mistake || "",
    lesson: existing?.lesson || "",
  });

  const [saving, setSaving] = useState(false);
  const { playSuccess } = useSoundEffects();
  const { showCelebrate } = useNotificationCoPilot();

  function update<K extends keyof Trade>(key: K, value: Trade[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.date || !form.instrument) return;

    setSaving(true);

    try {
      const resId = await saveTrade(uid, {
        ...form,
        id: existing?.id,
        entry: cleanNumber(form.entry),
        sl: cleanNumber(form.sl),
        tp: cleanNumber(form.tp),
        rr: cleanNumber(form.rr),
        result: cleanNumberOrBlank(form.result),
        pnl: cleanNumberOrBlank(form.pnl),
        executionRating: cleanNumberOrBlank(form.executionRating),
      });

      playSuccess();

      // Humanized Real-Time AI co-pilot celebration triggers!
      const pnlVal = form.pnl !== undefined && form.pnl !== "" && form.pnl !== null ? Number(form.pnl) : 0;
      const rVal = form.result !== undefined && form.result !== "" && form.result !== null ? Number(form.result) : 0;
      const instr = form.instrument || "trade";

      if (existing) {
        showCelebrate("Trade Log Updated!", `Your updates to ${instr} have been recorded successfully.`, "success");
      } else {
        if (rVal > 0) {
          showCelebrate(
            "Profit Secured! 💰", 
            `Superb execution on ${instr}! You banked +${rVal}R ($${pnlVal.toFixed(0)}). Your discipline is creating real consistency.`, 
            "celebrate"
          );
        } else if (rVal < 0) {
          showCelebrate(
            "Controlled Risk. ❤️", 
            `Took a loss of ${rVal}R on ${instr}. That is perfectly okay. Accepting a loss gracefully is the ultimate hallmark of a professional.`, 
            "motivation"
          );
        } else {
          showCelebrate(
            "Trade Logged! 📝", 
            `Your trade on ${instr} is safe in your journal. AI analysis pending on your next session check-out!`, 
            "success"
          );
        }
      }

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section
        title="Trade Setup"
        description="Core trade details and strategy context."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              value={String(form.date || "")}
              onChange={(e) => update("date", e.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Entry Time">
            <input
              type="time"
              value={String(form.time || "")}
              onChange={(e) => update("time", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Account">
            <select
              value={String(form.account || "")}
              onChange={(e) => update("account", e.target.value)}
              className={selectClass}
            >
              <option value="">No Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.name}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Strategy">
            <select
              value={String(form.setup || "")}
              onChange={(e) => update("setup", e.target.value)}
              className={selectClass}
            >
              <option value="">No strategy</option>
              {strategyOptions.map((setup) => (
                <option key={setup} value={setup}>
                  {setup}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Instrument">
            <select
              value={String(form.instrument || "")}
              onChange={(e) => update("instrument", e.target.value)}
              className={selectClass}
              required
            >
              {instruments.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Direction">
            <select
              value={String(form.direction || "LONG")}
              onChange={(e) => update("direction", e.target.value)}
              className={selectClass}
            >
              <option value="LONG">LONG 📈</option>
              <option value="SHORT">SHORT 📉</option>
            </select>
          </Field>

          <Field label="Session">
            <select
              value={String(form.session || "")}
              onChange={(e) => update("session", e.target.value)}
              className={selectClass}
            >
              {sessions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Timeframe">
            <select
              value={String(form.timeframe || "")}
              onChange={(e) => update("timeframe", e.target.value)}
              className={selectClass}
            >
              {timeframes.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title="Risk & Result"
        description="Compare planned risk against actual outcome."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Entry">
            <input
              value={String(form.entry || "")}
              onChange={(e) => update("entry", e.target.value)}
              className={inputClass}
              placeholder="2350.50"
            />
          </Field>

          <Field label="Stop Loss">
            <input
              value={String(form.sl || "")}
              onChange={(e) => update("sl", e.target.value)}
              className={inputClass}
              placeholder="2345.00"
            />
          </Field>

          <Field label="Take Profit">
            <input
              value={String(form.tp || "")}
              onChange={(e) => update("tp", e.target.value)}
              className={inputClass}
              placeholder="2365.00"
            />
          </Field>

          <Field label="Planned R:R">
            <input
              value={String(form.rr || "")}
              onChange={(e) => update("rr", e.target.value)}
              className={inputClass}
              placeholder="2"
            />
          </Field>

          <Field label="Result R">
            <input
              value={String(form.result ?? "")}
              onChange={(e) => update("result", e.target.value)}
              className={inputClass}
              placeholder="2 or -1, blank if open"
            />
          </Field>

          <Field label="Profit / Loss $">
            <input
              value={String(form.pnl ?? "")}
              onChange={(e) => update("pnl", e.target.value)}
              className={inputClass}
              placeholder="250 or -100"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Review Quality"
        description="Turn this trade into data your future self can use."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Emotion">
            <select
              value={String(form.emotion || "")}
              onChange={(e) => update("emotion", e.target.value)}
              className={selectClass}
            >
              {emotions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Execution Rating">
            <select
              value={String(form.executionRating || "")}
              onChange={(e) => update("executionRating", e.target.value)}
              className={selectClass}
            >
              <option value="">Not rated</option>
              <option value="5">5 — A+ execution</option>
              <option value="4">4 — Good</option>
              <option value="3">3 — Acceptable</option>
              <option value="2">2 — Weak</option>
              <option value="1">1 — Rule break</option>
            </select>
          </Field>

          <Field label="Mistake / Leak">
            <select
              value={String(form.mistake || "")}
              onChange={(e) => update("mistake", e.target.value)}
              className={selectClass}
            >
              {mistakes.map((x) => (
                <option key={x} value={x}>
                  {x || "No mistake selected"}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Chart Link">
            <input
              value={String(form.chartUrl || "")}
              onChange={(e) => update("chartUrl", e.target.value)}
              className={inputClass}
              placeholder="https://tradingview.com/..."
            />
          </Field>
        </div>

        <Field label="Trade Notes">
          <textarea
            value={String(form.notes || "")}
            onChange={(e) => update("notes", e.target.value)}
            className={`${inputClass} min-h-28 resize-y`}
            placeholder="Reasoning, execution quality, what you'd do differently..."
          />
        </Field>

        <Field label="Lesson">
          <textarea
            value={String(form.lesson || "")}
            onChange={(e) => update("lesson", e.target.value)}
            className={`${inputClass} min-h-20 resize-y`}
            placeholder="What is the one lesson from this trade?"
          />
        </Field>

        <Field label="Tags">
          <input
            value={String(form.tags || "")}
            onChange={(e) => update("tags", e.target.value)}
            className={inputClass}
            placeholder="A+, rule-break, FOMO, news"
          />
        </Field>

        <button
          type="button"
          onClick={() => update("reviewed", !form.reviewed)}
          className={[
            "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black",
            form.reviewed
              ? "border-[#00D084]/20 bg-[#00D084]/10 text-[#00D084]"
              : "border-[#1E1E38] bg-[#0D0D1A] text-[#A0A0C0]",
          ].join(" ")}
        >
          <CheckCircle2 size={17} />
          {form.reviewed ? "Reviewed" : "Mark as Reviewed"}
        </button>
      </Section>

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
              ? "Save Changes"
              : "Log Trade"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold text-[#F0F0FF] outline-none focus:border-[#F0B429] [color-scheme:dark]";

const selectClass =
  `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A0A0C0%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10`;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#1E1E38] bg-[#111120] p-4">
      <div className="mb-4">
        <h3 className="text-sm font-black">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#5A5A80]">{description}</p>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

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

function cleanNumberOrBlank(value: unknown) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  return Number.isFinite(num) ? num : "";
}

function uniqueClean(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const clean = String(value || "").trim();
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(clean);
  }

  return out.sort((a, b) => a.localeCompare(b));
}