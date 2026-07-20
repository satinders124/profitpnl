"use client";

import { getTrades, saveTrade } from "@/lib/db";
import { getDailyPlan, type DailyPlanRecord } from "@/lib/daily-plans";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import { Trade } from "@/types/trade";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const quickResults = [
  { label: "-1R", value: "-1" },
  { label: "BE", value: "0" },
  { label: "+1R", value: "1" },
  { label: "+2R", value: "2" },
  { label: "+3R", value: "3" },
];

const quickEmotions = ["Disciplined", "Calm", "Patient", "FOMO", "Anxious", "Revenge"];
const quickMistakes = ["None", "FOMO Entry", "Late Entry", "Moved Stop", "Revenge Trade", "Overtrading"];

const draftMeaningfulKeys: Array<keyof Trade> = [
  "account",
  "instrument",
  "direction",
  "setup",
  "session",
  "timeframe",
  "entry",
  "sl",
  "tp",
  "rr",
  "result",
  "pnl",
  "notes",
  "tags",
  "chartUrl",
  "time",
  "executionRating",
  "mistake",
  "lesson",
];

function hasMeaningfulDraft(form: Partial<Trade>, defaults: Partial<Trade>) {
  return draftMeaningfulKeys.some((key) => {
    const value = form[key];
    const defaultValue = defaults[key];
    return String(value ?? "").trim() !== "" && String(value ?? "") !== String(defaultValue ?? "");
  });
}

function hasOutcome(form: Partial<Trade>) {
  return [form.result, form.pnl].some((value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value)));
}

function initialTradeState(form: Partial<Trade>, isEditing: boolean): "open" | "closed" {
  if (hasOutcome(form)) return "closed";
  return isEditing ? "open" : "closed";
}

function loadSavedDraft(draftKey: string, defaults: Partial<Trade>) {
  if (typeof window === "undefined") return { form: defaults, restored: false, tradeState: initialTradeState(defaults, false) };
  try {
    const savedDraft = localStorage.getItem(draftKey);
    if (!savedDraft) return { form: defaults, restored: false, tradeState: initialTradeState(defaults, false) };
    const parsed = JSON.parse(savedDraft) as Partial<Trade> & { __tradeState?: "open" | "closed" };
    const restored = hasMeaningfulDraft(parsed, defaults);
    const restoredTradeState = parsed.__tradeState === "open" || parsed.__tradeState === "closed" ? parsed.__tradeState : initialTradeState(parsed, false);
    return { form: { ...defaults, ...parsed, date: parsed.date || defaults.date }, restored, tradeState: restoredTradeState };
  } catch {
    return { form: defaults, restored: false, tradeState: initialTradeState(defaults, false) };
  }
}

function cleanText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function setupMatchesAllowed(setup: unknown, allowedSetups: string[]) {
  const current = cleanText(setup);
  if (!current) return false;
  if (!allowedSetups.length) return true;
  return allowedSetups.some((allowed) => {
    const clean = cleanText(allowed);
    if (!clean) return false;
    if (clean.includes("only a+") || clean.includes("verified setup")) return true;
    return current === clean || current.includes(clean) || clean.includes(current);
  });
}

function avoidHitsForTrade(form: Partial<Trade>, avoidList: string[]) {
  const haystack = cleanText([form.setup, form.emotion, form.mistake, form.tags, form.notes].filter(Boolean).join(" "));
  return avoidList.filter((avoid) => {
    const clean = cleanText(avoid);
    if (!clean) return false;
    if (haystack.includes(clean)) return true;
    if (clean.includes("revenge") && haystack.includes("revenge")) return true;
    if (clean.includes("fomo") && haystack.includes("fomo")) return true;
    if (clean.includes("overtrad") && haystack.includes("overtrad")) return true;
    return false;
  });
}

type GuardrailItem = {
  level: "ok" | "info" | "warn" | "danger";
  title: string;
  body: string;
};

function buildGuardrails({
  plan,
  checked,
  form,
  todaysTradeCount,
  isEditing,
}: {
  plan: DailyPlanRecord | null;
  checked: boolean;
  form: Partial<Trade>;
  todaysTradeCount: number;
  isEditing: boolean;
}): GuardrailItem[] {
  if (!checked) {
    return [{ level: "info", title: "Checking Daily Plan", body: "ProfitPnL is loading today’s locked plan and trade count." }];
  }

  if (!plan) {
    return [{ level: "danger", title: "Daily Plan not locked", body: "No accepted Daily Plan was found for this date. Log only if this trade was still planned." }];
  }

  const items: GuardrailItem[] = [];
  if (plan.acceptedAt) {
    items.push({ level: "ok", title: "Daily Plan locked", body: `${plan.riskLevel} · ${plan.riskScale || "planned risk"}` });
  } else {
    items.push({ level: "warn", title: "Plan exists but is not locked", body: "Generate/accept the Daily Plan before treating this trade as on-plan." });
  }

  const projectedTrades = todaysTradeCount + (isEditing ? 0 : 1);
  if (plan.maxTrades > 0 && projectedTrades > plan.maxTrades) {
    items.push({ level: "danger", title: "Max trades exceeded", body: `This would be trade ${projectedTrades}/${plan.maxTrades} for the plan date.` });
  } else if (plan.maxTrades > 0 && projectedTrades === plan.maxTrades) {
    items.push({ level: "warn", title: "Final planned trade slot", body: `This uses trade ${projectedTrades}/${plan.maxTrades}. No extra trades after this without a new plan.` });
  } else if (plan.maxTrades > 0) {
    items.push({ level: "ok", title: "Trade count within plan", body: `Projected count: ${projectedTrades}/${plan.maxTrades}.` });
  }

  const setup = String(form.setup || "").trim();
  if (!setup) {
    items.push({ level: "warn", title: "Setup not selected", body: "Choose a setup so Plan vs Execution can score this trade correctly." });
  } else if (!setupMatchesAllowed(setup, plan.allowedSetups || [])) {
    items.push({ level: "danger", title: "Setup outside allowed list", body: `${setup} is not in today’s allowed setups: ${(plan.allowedSetups || []).join(", ") || "none"}.` });
  } else {
    items.push({ level: "ok", title: "Setup matches plan", body: `${setup} is permitted by today’s plan.` });
  }

  const avoidHits = avoidHitsForTrade(form, plan.avoidList || []);
  if (avoidHits.length) {
    items.push({ level: "danger", title: "Avoid-list trigger detected", body: `Matched: ${avoidHits.slice(0, 3).join(", ")}. Pause before saving this as an execution trade.` });
  }

  return items.slice(0, 6);
}

export type TradeSaveResult = {
  id: string;
  trade: Partial<Trade>;
  isNew: boolean;
};

type TradeFormProps = {
  uid: string;
  existing?: Trade | null;
  accounts: TradingAccount[];
  playbook: PlaybookSetup[];
  strategiesFromTrades: string[];
  onSaved: (result: TradeSaveResult) => void | Promise<void>;
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

  const draftKey = `profitpnl_trade_form_draft_${uid}`;
  const defaultForm: Partial<Trade> = useMemo(() => ({
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
  }), [existing, today]);

  const initialDraft = useMemo(
    () => (existing ? { form: defaultForm, restored: false, tradeState: initialTradeState(defaultForm, true) } : loadSavedDraft(draftKey, defaultForm)),
    [draftKey, existing, defaultForm]
  );

  const [form, setForm] = useState<Partial<Trade>>(initialDraft.form);
  const [tradeState, setTradeState] = useState<"open" | "closed">(() => initialDraft.tradeState);
  const [draftRestored, setDraftRestored] = useState(initialDraft.restored);
  const [draftCleared, setDraftCleared] = useState(false);

  const [saving, setSaving] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanRecord | null>(null);
  const [dailyPlanChecked, setDailyPlanChecked] = useState(false);
  const [todaysTradeCount, setTodaysTradeCount] = useState(0);
  const { playSuccess } = useSoundEffects();
  const { showCelebrate } = useNotificationCoPilot();
  const planDate = String(form.date || today);

  useEffect(() => {
    let cancelled = false;
    async function loadGuardrailContext() {
      if (!uid || !planDate) return;
      setDailyPlanChecked(false);
      try {
        const [plan, rows] = await Promise.all([
          getDailyPlan(uid, planDate).catch(() => null),
          getTrades(uid).catch(() => []),
        ]);
        if (cancelled) return;
        setDailyPlan(plan);
        setTodaysTradeCount(rows.filter((trade) => trade.date === planDate && trade.id !== existing?.id).length);
      } finally {
        if (!cancelled) setDailyPlanChecked(true);
      }
    }
    loadGuardrailContext();
    return () => {
      cancelled = true;
    };
  }, [existing?.id, planDate, uid]);

  useEffect(() => {
    if (existing || typeof window === "undefined") return;
    try {
      if (hasMeaningfulDraft(form, defaultForm)) {
        localStorage.setItem(draftKey, JSON.stringify({ ...form, __tradeState: tradeState }));
      } else if (!draftRestored) {
        localStorage.removeItem(draftKey);
      }
    } catch {
      // ignore unavailable storage
    }
  }, [defaultForm, draftKey, draftRestored, existing, form, tradeState]);

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore unavailable storage
    }
    setForm(defaultForm);
    setTradeState(initialTradeState(defaultForm, Boolean(existing)));
    setDraftRestored(false);
    setDraftCleared(true);
  }

  function update<K extends keyof Trade>(key: K, value: Trade[K]) {
    setDraftCleared(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setTicketState(nextState: "open" | "closed") {
    setTradeState(nextState);
    setDraftCleared(false);
    if (nextState === "open") {
      setForm((prev) => ({ ...prev, result: "", pnl: "", reviewed: false }));
    }
  }

  function applyQuickResult(value: string) {
    setTradeState("closed");
    setDraftCleared(false);
    setForm((prev) => ({ ...prev, result: value }));
  }

  const guardrails = useMemo(() => buildGuardrails({
    plan: dailyPlan,
    checked: dailyPlanChecked,
    form,
    todaysTradeCount,
    isEditing: Boolean(existing),
  }), [dailyPlan, dailyPlanChecked, existing, form, todaysTradeCount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.date || !form.instrument) return;

    const dangerItems = guardrails.filter((item) => item.level === "danger");
    if (dangerItems.length && typeof window !== "undefined") {
      const ok = window.confirm(`Daily Plan guardrails detected: ${dangerItems.map((item) => item.title).join(", ")}. Log this trade anyway?`);
      if (!ok) return;
    }

    setSaving(true);

    try {
      const cleanedTrade = {
        ...form,
        id: existing?.id,
        entry: cleanNumber(form.entry),
        sl: cleanNumber(form.sl),
        tp: cleanNumber(form.tp),
        rr: cleanNumber(form.rr),
        result: tradeState === "open" ? "" : cleanNumberOrBlank(form.result),
        pnl: tradeState === "open" ? "" : cleanNumberOrBlank(form.pnl),
        reviewed: tradeState === "open" ? false : form.reviewed,
        executionRating: cleanNumberOrBlank(form.executionRating),
      };
      const savedId = await saveTrade(uid, cleanedTrade);

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

      if (!existing && typeof window !== "undefined") {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore unavailable storage
        }
      }

      await onSaved({ id: savedId, trade: { ...cleanedTrade, id: savedId }, isNew: !existing });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {!existing && (draftRestored || draftCleared) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${draftRestored ? "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]" : "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              {draftRestored ? <RotateCcw size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
              <div>
                <p className="font-black">{draftRestored ? "Draft restored from your last session." : "Draft cleared."}</p>
                <p className="mt-0.5 text-xs opacity-80">
                  {draftRestored
                    ? "You can continue logging this trade or clear it to start fresh."
                    : "You are now starting from a clean trade ticket."}
                </p>
              </div>
            </div>
            {draftRestored && (
              <button
                type="button"
                onClick={clearDraft}
                className="rounded-xl border border-[#F0B429]/30 px-3 py-2 text-xs font-black transition hover:bg-[#F0B429]/10"
              >
                Clear Draft
              </button>
            )}
          </div>
        </div>
      )}

      <DailyPlanGuardrailPanel
        items={guardrails}
        plan={dailyPlan}
        planDate={planDate}
        todaysTradeCount={todaysTradeCount}
        isEditing={Boolean(existing)}
      />

      <section className="rounded-2xl border border-[#1E1E38] bg-[#111120] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black">Trade Ticket Speed Mode</h3>
            <p className="mt-1 text-xs leading-5 text-[#5A5A80]">Choose whether this is an open position or a closed trade, then use quick buttons to reduce mobile typing.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#1E1E38] bg-[#080810] p-1">
            {(["open", "closed"] as const).map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setTicketState(state)}
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${tradeState === state ? "bg-[#F0B429] text-[#080810]" : "text-[#8080A0] hover:text-white"}`}
              >
                {state === "open" ? "Open" : "Closed"}
              </button>
            ))}
          </div>
        </div>

        {tradeState === "closed" ? (
          <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Quick Result</p>
            <div className="grid grid-cols-5 gap-2">
              {quickResults.map((item) => {
                const active = String(form.result ?? "") === item.value;
                const positive = Number(item.value) > 0;
                const negative = Number(item.value) < 0;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyQuickResult(item.value)}
                    className={`rounded-xl border px-2 py-2 text-xs font-black transition ${active ? "border-[#F0B429] bg-[#F0B429]/20 text-[#F0B429]" : negative ? "border-[#FF4565]/20 bg-[#FF4565]/10 text-[#FF8CA0]" : positive ? "border-[#00D084]/20 bg-[#00D084]/10 text-[#00D084]" : "border-[#1E1E38] bg-[#111124] text-zinc-300"}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#4C82FB]/25 bg-[#4C82FB]/10 p-4 text-sm leading-6 text-[#8BB0FF]">
            Open trade mode clears Result R and P&L, and keeps the trade out of completed-performance calculations until you update it later.
          </div>
        )}
      </section>

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
              inputMode="decimal"
              className={inputClass}
              placeholder="2350.50"
            />
          </Field>

          <Field label="Stop Loss">
            <input
              value={String(form.sl || "")}
              onChange={(e) => update("sl", e.target.value)}
              inputMode="decimal"
              className={inputClass}
              placeholder="2345.00"
            />
          </Field>

          <Field label="Take Profit">
            <input
              value={String(form.tp || "")}
              onChange={(e) => update("tp", e.target.value)}
              inputMode="decimal"
              className={inputClass}
              placeholder="2365.00"
            />
          </Field>

          <Field label="Planned R:R">
            <input
              value={String(form.rr || "")}
              onChange={(e) => update("rr", e.target.value)}
              inputMode="decimal"
              className={inputClass}
              placeholder="2"
            />
          </Field>

          <Field label="Result R">
            <input
              value={String(form.result ?? "")}
              onChange={(e) => {
                setTradeState("closed");
                update("result", e.target.value);
              }}
              inputMode="decimal"
              className={inputClass}
              placeholder={tradeState === "open" ? "Open trade" : "2 or -1"}
              disabled={tradeState === "open"}
            />
          </Field>

          <Field label="Profit / Loss $">
            <input
              value={String(form.pnl ?? "")}
              onChange={(e) => {
                setTradeState("closed");
                update("pnl", e.target.value);
              }}
              inputMode="decimal"
              className={inputClass}
              placeholder={tradeState === "open" ? "Open trade" : "250 or -100"}
              disabled={tradeState === "open"}
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
            <QuickChips
              values={quickEmotions}
              active={String(form.emotion || "")}
              onPick={(value) => update("emotion", value)}
            />
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
            <QuickChips
              values={quickMistakes}
              active={String(form.mistake || "")}
              onPick={(value) => update("mistake", value)}
            />
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

      {!existing && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-xs font-bold text-[#8080A0]">
          <ShieldCheck size={15} className="text-[#00D084]" />
          Draft saved automatically on this device while you type.
        </div>
      )}

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
              : tradeState === "open"
                ? "Save Open Trade"
                : "Log Closed Trade"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm font-bold text-[#F0F0FF] outline-none focus:border-[#F0B429] disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]";

const selectClass =
  `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A0A0C0%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat pr-10`;

function QuickChips({
  values,
  active,
  onPick,
}: {
  values: string[];
  active: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {values.map((value) => {
        const isActive = cleanText(active) === cleanText(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${isActive ? "border-[#F0B429]/40 bg-[#F0B429]/15 text-[#F0B429]" : "border-[#1E1E38] bg-[#080810] text-[#8080A0] hover:text-white"}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function DailyPlanGuardrailPanel({
  items,
  plan,
  planDate,
  todaysTradeCount,
  isEditing,
}: {
  items: GuardrailItem[];
  plan: DailyPlanRecord | null;
  planDate: string;
  todaysTradeCount: number;
  isEditing: boolean;
}) {
  const dangerCount = items.filter((item) => item.level === "danger").length;
  const warnCount = items.filter((item) => item.level === "warn").length;
  const headerTone = dangerCount ? "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]" : warnCount ? "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]" : "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]";
  const title = dangerCount ? "Off-plan risk detected" : warnCount ? "Plan caution" : "Daily Plan guardrails clear";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#F0B429]/10 blur-3xl" />
      <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">
            <ShieldCheck size={14} /> Daily Plan Guardrails
          </p>
          <h3 className="mt-1 text-base font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#8080A0]">
            {plan?.acceptedAt
              ? `${planDate} · ${todaysTradeCount}${isEditing ? " other" : ""} trade${todaysTradeCount === 1 ? "" : "s"} already logged before this ticket.`
              : "Lock your Daily Plan before trading so ProfitPnL can score execution cleanly."}
          </p>
        </div>
        <a href="/daily-plan" className={`inline-flex w-fit items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${headerTone}`}>
          Open Daily Plan
        </a>
      </div>

      <div className="relative grid gap-2 md:grid-cols-2">
        {items.map((item) => {
          const tone = item.level === "danger"
            ? "border-[#FF4565]/25 bg-[#FF4565]/10 text-[#FF8CA0]"
            : item.level === "warn"
              ? "border-[#F0B429]/25 bg-[#F0B429]/10 text-[#F0B429]"
              : item.level === "ok"
                ? "border-[#00D084]/25 bg-[#00D084]/10 text-[#00D084]"
                : "border-[#4C82FB]/25 bg-[#4C82FB]/10 text-[#8BB0FF]";
          const Icon = item.level === "danger" || item.level === "warn" ? AlertTriangle : CheckCircle2;
          return (
            <div key={`${item.title}-${item.body}`} className={`rounded-2xl border p-3 ${tone}`}>
              <div className="flex items-start gap-2">
                <Icon size={15} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-white">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-5 opacity-85">{item.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

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