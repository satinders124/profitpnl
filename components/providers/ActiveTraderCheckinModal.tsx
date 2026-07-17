"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveShift, clockIn } from "@/lib/shifts-db";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle2, Clock, ShieldAlert, Target, TimerReset, X } from "lucide-react";
import { useNotificationCoPilot } from "@/components/providers/NotificationProvider";

function parseCurrencyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currencyDisplay(value: number) {
  return value > 0 ? String(value) : "";
}

function CurrencyField({
  label,
  value,
  onChange,
  accent = "#F0B429",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accent?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <label className="mb-2 flex min-h-[2rem] items-end text-[10px] font-black uppercase leading-tight tracking-widest text-[#5A5A80]">
        {label}
      </label>
      <div
        className="flex h-12 items-center rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 transition-colors focus-within:border-[var(--field-accent)]"
        style={{ "--field-accent": accent } as React.CSSProperties}
      >
        <span className="mr-3 shrink-0 text-xs font-black" style={{ color: accent }}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={currencyDisplay(value)}
          onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
          placeholder="0"
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-[#3A3A5A]"
        />
      </div>
    </div>
  );
}

function ReadinessBadge({ sleep, stress, discipline }: { sleep: number; stress: number; discipline: number }) {
  const score = Math.max(0, Math.min(100, Math.round((sleep * 0.28 + (11 - stress) * 0.34 + discipline * 0.38) * 10)));
  const tone = score >= 75 ? "green" : score >= 50 ? "gold" : "red";
  const color = tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : "#F0B429";
  const label = tone === "green" ? "Cleared" : tone === "red" ? "Defense" : "Caution";

  return (
    <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810]/90 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Readiness</p>
          <p className="mt-1 text-xl font-black" style={{ color }}>{label}</p>
        </div>
        <div className="relative grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #24243C 0deg)` }}>
          <div className="absolute inset-2 rounded-full bg-[#080810]" />
          <span className="relative text-sm font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8080A0]">
        {tone === "green" ? "You can trade planned setups." : tone === "red" ? "Reduce size and trade only if the setup is perfect." : "Use smaller size and wait for clear confirmation."}
      </p>
    </div>
  );
}

function SliderControl({
  label,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-[#A0A0C0]">{label}</p>
          <p className="mt-1 text-[10px] text-[#5A5A80]">{low} → {high}</p>
        </div>
        <span className="rounded-xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-2.5 py-1 text-xs font-black text-[#F0B429]">
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-lg bg-[#24243C] accent-[#F0B429]"
      />
    </div>
  );
}

const focusTemplates = [
  "Trade only London Open, maximum 1 entry.",
  "Only A+ setup. Stop after first loss.",
  "No revenge trades. Wait for full confirmation.",
];

export function ActiveTraderCheckinModal() {
  const { user } = useAuth();
  const { showCelebrate } = useNotificationCoPilot();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sleep, setSleep] = useState(5);
  const [stress, setStress] = useState(5);
  const [discipline, setDiscipline] = useState(5);
  const [targetProfit, setTargetProfit] = useState(500);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState(250);
  const [preNotes, setPreNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canClockIn = useMemo(() => targetProfit > 0 && maxDrawdownLimit > 0, [targetProfit, maxDrawdownLimit]);

  useEffect(() => {
    async function checkActiveSession() {
      if (!user) return;
      try {
        const active = await getActiveShift(user.id);
        if (!active) {
          const dismissedToday = localStorage.getItem(`dismissed_checkin_${new Date().toDateString()}`);
          if (!dismissedToday) {
            setIsOpen(true);
          }
        }
      } catch (e) {
        console.error("Check active shift error:", e);
      } finally {
        setLoading(false);
      }
    }
    checkActiveSession();
  }, [user]);

  const handleClockIn = async () => {
    if (!user || !canClockIn) return;
    setActionLoading(true);
    try {
      await clockIn(user.id, {
        sleepQuality: sleep,
        stressLevel: stress,
        disciplineLevel: discipline,
        preNotes,
        targetProfit: Number(targetProfit) || 0,
        maxDrawdownLimit: Number(maxDrawdownLimit) || 0,
      });
      window.dispatchEvent(new Event("profitpnl:shift-updated"));
      showCelebrate(
        "Shift Active! ⏱️",
        "Your AI Risk-Guard has loaded. Trade responsibly, protect your targets.",
        "success"
      );
      setIsOpen(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const dismissToday = () => {
    localStorage.setItem(`dismissed_checkin_${new Date().toDateString()}`, "true");
    setIsOpen(false);
  };

  if (loading || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <div className="absolute inset-0" onClick={dismissToday} />

        <motion.div
          initial={{ opacity: 0, y: 42, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 42, scale: 0.96 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#24243C] bg-[#0F0F1E] shadow-2xl"
        >
          <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[#F0B429]/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-[#00D084]/5 blur-3xl pointer-events-none" />

          <div className="relative border-b border-[#1E1E38] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 text-[#F0B429] shadow-[0_0_30px_-15px_#F0B429]">
                  <Brain size={24} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#F0B429]">Pre-Session Clearance</p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-white">AI Risk-Guard Check-In</h3>
                  <p className="mt-1 text-sm text-[#8080A0]">Set your risk budget, mental state, and stop rules before the first trade.</p>
                </div>
              </div>
              <button onClick={dismissToday} className="rounded-xl bg-[#111124] p-2 text-[#8080A0] hover:text-white" aria-label="Close check-in">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 items-end gap-4">
                <CurrencyField label="Today's Profit Target" value={targetProfit} onChange={setTargetProfit} accent="#F0B429" />
                <CurrencyField label="Daily Loss Limit" value={maxDrawdownLimit} onChange={setMaxDrawdownLimit} accent="#FF4565" />
              </div>

              <SliderControl label="Sleep Quality" value={sleep} onChange={setSleep} low="Fatigued" high="Sharp" />
              <SliderControl label="Mental Stress" value={stress} onChange={setStress} low="Calm" high="Pressured" />
              <SliderControl label="Emotional Discipline" value={discipline} onChange={setDiscipline} low="Impulsive" high="Locked-in" />

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">Pre-Shift Focus Notes</label>
                <textarea
                  value={preNotes}
                  onChange={(event) => setPreNotes(event.target.value)}
                  placeholder="e.g. Trade only London Open, maximum 1 entry"
                  className="h-24 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm font-medium text-white outline-none transition focus:border-[#F0B429]"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {focusTemplates.map((template) => (
                    <button
                      key={template}
                      onClick={() => setPreNotes(template)}
                      className="rounded-full border border-[#1E1E38] bg-[#111124] px-3 py-1.5 text-[10px] font-bold text-[#A0A0C0] transition hover:border-[#F0B429]/40 hover:text-[#F0B429]"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <ReadinessBadge sleep={sleep} stress={stress} discipline={discipline} />

              <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810] p-4">
                <div className="flex items-center gap-2 text-[#F0B429]">
                  <Target size={15} />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]">Today&apos;s Rules</p>
                </div>
                <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-300">
                  <p className="flex gap-2"><CheckCircle2 size={13} className="mt-1 shrink-0 text-[#00D084]" /> Max risk is capped by your daily loss limit.</p>
                  <p className="flex gap-2"><ShieldAlert size={13} className="mt-1 shrink-0 text-[#FF4565]" /> Stop immediately after one emotional rule break.</p>
                  <p className="flex gap-2"><TimerReset size={13} className="mt-1 shrink-0 text-[#F0B429]" /> Pause after a loss before taking another setup.</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Shift Budget</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#111124] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[#5A5A80]">Target</p>
                    <p className="mt-1 text-sm font-black text-[#F0B429]">${targetProfit.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl bg-[#111124] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[#5A5A80]">Max Loss</p>
                    <p className="mt-1 text-sm font-black text-[#FF4565]">${maxDrawdownLimit.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  onClick={dismissToday}
                  className="rounded-2xl border border-[#1E1E38] px-5 py-3 text-sm font-black text-[#A0A0C0] transition hover:bg-[#1E1E38]/30 active:scale-[0.98]"
                >
                  Skip Today
                </button>
                <button
                  onClick={handleClockIn}
                  disabled={actionLoading || !canClockIn}
                  className="gold-gradient flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] transition hover:shadow-[0_0_25px_rgba(240,180,41,0.35)] active:scale-[0.98] disabled:opacity-50"
                >
                  {actionLoading ? <Clock size={15} className="animate-spin" /> : <Clock size={15} />}
                  {actionLoading ? "Starting Shift..." : "Clock-In Shift"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default ActiveTraderCheckinModal;
