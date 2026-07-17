"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveShift, getRecentShifts, clockIn, TraderShift } from "@/lib/shifts-db";
import { getTrades } from "@/lib/db";
import {
  formatShiftDuration,
  formatShiftMoney,
  getShiftDurationMinutes,
  getShiftReportSummary,
} from "@/lib/shift-report";
import { Trade } from "@/types/trade";
import { ActiveShiftTerminal } from "@/components/backtesting/ActiveShiftTerminal";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Gauge,
  Heart,
  LockKeyhole,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";

type RiskLevel = "CLEARED" | "CAUTION" | "HIGH TILT RISK";
type RiskTone = "safe" | "caution" | "danger";

type RiskDiagnosis = {
  score: number;
  level: RiskLevel;
  tone: RiskTone;
  clearance: string;
  advice: string;
  leaks: string[];
  maxTrades: number;
  sizeRule: string;
  stopRule: string;
};

type JournalInsights = {
  streak: number;
  streakType: "win" | "loss" | "neutral";
  leakEmotion: string;
  closedCount: number;
};

function numberFrom(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildJournalInsights(trades: Trade[]): JournalInsights {
  const closed = trades
    .filter((trade) => trade.result !== "" && trade.result !== null && trade.result !== undefined)
    .slice()
    .sort((a, b) => `${b.date || ""}`.localeCompare(`${a.date || ""}`));

  let streak = 0;
  let currentStreakType: "win" | "loss" | "neutral" = "neutral";

  for (const trade of closed) {
    const result = numberFrom(trade.result, 0);
    const type = result > 0 ? "win" : result < 0 ? "loss" : "neutral";
    if (type === "neutral") continue;
    if (currentStreakType === "neutral") {
      currentStreakType = type;
      streak = 1;
      continue;
    }
    if (type === currentStreakType) streak += 1;
    else break;
  }

  const emotionalLosses = trades.filter((trade) => numberFrom(trade.result, 0) < 0 && trade.emotion);
  const emotionFreq: Record<string, number> = {};
  emotionalLosses.forEach((trade) => {
    const emotion = `${trade.emotion}`.trim();
    if (emotion) emotionFreq[emotion] = (emotionFreq[emotion] || 0) + 1;
  });

  return {
    streak,
    streakType: currentStreakType,
    leakEmotion: Object.entries(emotionFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "None detected",
    closedCount: closed.length,
  };
}

function buildRiskDiagnosis({
  stress,
  sleep,
  discipline,
  insights,
}: {
  stress: number;
  sleep: number;
  discipline: number;
  insights: JournalInsights;
}): RiskDiagnosis {
  let score = 24;
  const leaks: string[] = [];

  if (stress >= 8) {
    score += 26;
    leaks.push("Stress is elevated; impulse entries and early exits become more likely.");
  } else if (stress >= 6) {
    score += 14;
    leaks.push("Stress is moderate; keep execution slower than usual.");
  }

  if (sleep <= 4) {
    score += 22;
    leaks.push("Low sleep quality can weaken patience and rule discipline.");
  } else if (sleep <= 6) {
    score += 10;
  }

  if (discipline <= 4) {
    score += 24;
    leaks.push("Self-discipline is low; reduce decision-load before risking capital.");
  } else if (discipline <= 6) {
    score += 12;
  }

  if (insights.streakType === "loss" && insights.streak >= 2) {
    score += 14;
    leaks.push(`You are coming from a ${insights.streak}-loss sequence; revenge-trade risk is higher.`);
  }

  score = Math.min(100, Math.max(0, score));

  if (score >= 70) {
    return {
      score,
      level: "HIGH TILT RISK",
      tone: "danger",
      clearance: "Reduced-size permission only",
      advice: "Trade only if the setup is perfect. Cut size, cap the session at one trade, and stop immediately after a rule break.",
      leaks,
      maxTrades: 1,
      sizeRule: "25% normal risk",
      stopRule: "Stop after 1 loss, 1 rule break, or any revenge/FOMO trigger.",
    };
  }

  if (score >= 45) {
    return {
      score,
      level: "CAUTION",
      tone: "caution",
      clearance: "Approved with guardrails",
      advice: "You can trade, but only with tight process control. Wait for A+ setups and pause after any loss.",
      leaks,
      maxTrades: 2,
      sizeRule: "50% to 75% normal risk",
      stopRule: "Pause 10 minutes after a loss; stop after 2 losses or 1 rule break.",
    };
  }

  return {
    score,
    level: "CLEARED",
    tone: "safe",
    clearance: "Approved to trade",
    advice: "Your mental state is inside the trading window. Keep risk planned, stay selective, and execute only verified playbook setups.",
    leaks,
    maxTrades: 3,
    sizeRule: "Normal planned risk",
    stopRule: "Stop at daily loss limit or after any emotional rule break.",
  };
}

function toneClasses(tone: RiskTone) {
  if (tone === "safe") {
    return {
      text: "text-[#00D084]",
      border: "border-[#00D084]/35",
      bg: "bg-[#00D084]/10",
      glow: "shadow-[0_0_45px_-18px_#00D084]",
      gradient: "from-[#00D084] to-emerald-300",
    };
  }
  if (tone === "danger") {
    return {
      text: "text-[#FF4565]",
      border: "border-[#FF4565]/35",
      bg: "bg-[#FF4565]/10",
      glow: "shadow-[0_0_45px_-18px_#FF4565]",
      gradient: "from-[#FF4565] to-red-300",
    };
  }
  return {
    text: "text-[#F0B429]",
    border: "border-[#F0B429]/35",
    bg: "bg-[#F0B429]/10",
    glow: "shadow-[0_0_45px_-18px_#F0B429]",
    gradient: "from-[#F0B429] to-yellow-200",
  };
}

function shiftGrade(shift: TraderShift) {
  const discipline = numberFrom(shift.postDiscipline, 0);
  const stress = numberFrom(shift.stressLevel, 5);
  if (discipline >= 8 && stress <= 5) return { grade: "A", label: "Clean execution", tone: "safe" as RiskTone };
  if (discipline >= 6) return { grade: "B", label: "Controlled session", tone: "safe" as RiskTone };
  if (discipline >= 4) return { grade: "C", label: "Discipline leak", tone: "caution" as RiskTone };
  return { grade: "D", label: "Tilt risk", tone: "danger" as RiskTone };
}

function prescriptionForShift(shift: TraderShift) {
  const discipline = numberFrom(shift.postDiscipline, 0);
  const stress = numberFrom(shift.stressLevel, 5);
  if (discipline <= 3 || stress >= 8) {
    return "Next session: trade half size, cap yourself at one A+ setup, and stop immediately after the first emotional trigger.";
  }
  if (discipline <= 5) {
    return "Next session: reduce size, use a two-trade cap, and take a mandatory 10-minute pause after any loss.";
  }
  return "Next session: repeat the same structure, keep risk fixed, and avoid increasing size just because the previous session felt controlled.";
}

function RiskGauge({ diagnosis }: { diagnosis: RiskDiagnosis }) {
  const colors = toneClasses(diagnosis.tone);
  const safeScore = Math.max(0, Math.min(100, diagnosis.score));

  return (
    <div className={`relative mx-auto flex h-44 w-44 items-center justify-center rounded-full ${colors.glow}`}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${diagnosis.tone === "danger" ? "#FF4565" : diagnosis.tone === "caution" ? "#F0B429" : "#00D084"} ${safeScore * 3.6}deg, rgba(36,36,60,0.95) 0deg)`,
        }}
      />
      <div className="absolute inset-3 rounded-full bg-[#080810] border border-white/5" />
      <div className="relative z-10 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#5A5A80]">Risk Score</p>
        <p className={`mt-1 text-5xl font-black tracking-tighter ${colors.text}`}>{diagnosis.score}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">/100</p>
      </div>
    </div>
  );
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0B0B16]/80 p-4 shadow-inner shadow-black/20">
      <div className="flex items-center gap-2 text-[#F0B429]">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      </div>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0A0A14]/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A0A0C0]">{label}</p>
          <p className="mt-1 text-[10px] text-[#5A5A80]">{lowLabel} → {highLabel}</p>
        </div>
        <span className="rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-sm font-black text-[#F0B429]">
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full h-1.5 cursor-pointer appearance-none rounded-lg bg-[#1E1E38] accent-[#F0B429]"
      />
    </div>
  );
}

export default function PwaPsychologyGuardPage() {
  const { user } = useAuth();

  const [activeShift, setActiveShift] = useState<TraderShift | null>(null);
  const [recentShifts, setRecentShifts] = useState<TraderShift[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [discipline, setDiscipline] = useState(5);
  const [preNotes, setPreNotes] = useState("");
  const [targetProfit, setTargetProfit] = useState(500);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState(250);

  const [selectedDayShift, setSelectedDayShift] = useState<TraderShift | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [active, recent, tradeRows] = await Promise.all([
        getActiveShift(user.id),
        getRecentShifts(user.id),
        getTrades(user.id),
      ]);
      setActiveShift(active);
      setRecentShifts(recent);
      setTrades(tradeRows);
    } catch (err) {
      console.error("Load shifts data error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const journalInsights = useMemo(() => buildJournalInsights(trades), [trades]);
  const riskDiagnosis = useMemo(
    () => buildRiskDiagnosis({ stress, sleep, discipline, insights: journalInsights }),
    [stress, sleep, discipline, journalInsights]
  );
  const riskStyle = toneClasses(riskDiagnosis.tone);
  const latestShift = recentShifts[0];
  const latestGrade = latestShift ? shiftGrade(latestShift) : null;

  const handleClockIn = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await clockIn(user.id, {
        sleepQuality: sleep,
        stressLevel: stress,
        disciplineLevel: discipline,
        preNotes,
        targetProfit,
        maxDrawdownLimit,
      });
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell title="AI Risk-Guard" subtitle="Trading psychology command center.">
      <div className="mx-auto max-w-6xl space-y-7 pb-24">
        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#090910] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(240,180,41,0.18),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(0,208,132,0.10),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_45%)]" />
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#F0B429]/70 to-transparent" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_0.9fr] lg:p-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/25 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                <Sparkles size={12} /> ProfitPnL Behavioral Risk Desk
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-6xl">
                  AI Risk-Guard
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                  Your pre-trade risk manager. Scan your mental state, receive trade permission, set hard guardrails, and let the system protect your account before the first click.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile
                  label="Shift Status"
                  value={activeShift ? "Active Desk" : "Off-Duty"}
                  icon={activeShift ? <ShieldCheck size={14} /> : <LockKeyhole size={14} />}
                />
                <MetricTile
                  label="Journal Context"
                  value={`${journalInsights.closedCount} trades`}
                  icon={<BarChart3 size={14} />}
                />
                <MetricTile
                  label="Last Session"
                  value={latestGrade ? `${latestGrade.grade} · ${latestGrade.label}` : "No report yet"}
                  icon={<ClipboardCheck size={14} />}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/85 p-5 backdrop-blur-xl">
              <RiskGauge diagnosis={riskDiagnosis} />
              <div className="mt-5 text-center">
                <p className={`text-sm font-black uppercase tracking-[0.16em] ${riskStyle.text}`}>{riskDiagnosis.level}</p>
                <p className="mt-2 text-xs leading-6 text-[#A0A0C0]">{riskDiagnosis.clearance}</p>
              </div>
              <div className={`mt-5 rounded-2xl border ${riskStyle.border} ${riskStyle.bg} p-4 text-xs leading-6 text-zinc-200`}>
                <span className="font-black text-white">AI verdict:</span> {riskDiagnosis.advice}
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card className="p-10 text-center text-sm font-bold text-[#5A5A80]">
            Initializing Risk-Guard terminal…
          </Card>
        ) : activeShift ? (
          <ActiveShiftTerminal activeShift={activeShift} onStateChange={loadData} />
        ) : (
          <div className="grid gap-7 lg:grid-cols-[1.45fr_0.9fr]">
            <div className="space-y-7">
              <Card className="overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-0 shadow-2xl shadow-black/30">
                <div className="border-b border-[#1E1E38] bg-gradient-to-r from-[#14142B] to-[#0D0D1A] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0B429]/10 text-[#F0B429] shadow-[0_0_30px_-12px_#F0B429]">
                        <LogIn size={22} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">Pre-Session Clearance</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-white">Risk scan before you trade</h2>
                        <p className="mt-1 text-xs leading-6 text-[#8080A0]">Complete the check-in and lock today&apos;s trading guardrails.</p>
                      </div>
                    </div>
                    <span className={`hidden rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider sm:inline-flex ${riskStyle.border} ${riskStyle.text}`}>
                      {scanComplete ? "Scanned" : "Live Preview"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Today&apos;s Profit Target</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#F0B429]">$</span>
                          <input
                            type="number"
                            value={targetProfit}
                            onChange={(event) => setTargetProfit(Number(event.target.value))}
                            className="h-12 w-full rounded-2xl border border-[#1E1E38] bg-[#080810] pl-8 pr-4 text-sm font-black text-white outline-none transition focus:border-[#F0B429]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Daily Loss Limit</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#FF4565]">$</span>
                          <input
                            type="number"
                            value={maxDrawdownLimit}
                            onChange={(event) => setMaxDrawdownLimit(Number(event.target.value))}
                            className="h-12 w-full rounded-2xl border border-[#1E1E38] bg-[#080810] pl-8 pr-4 text-sm font-black text-white outline-none transition focus:border-[#FF4565]"
                          />
                        </div>
                      </div>
                    </div>

                    <SliderRow label="Sleep Quality" value={sleep} onChange={setSleep} lowLabel="Fatigued" highLabel="Sharp" />
                    <SliderRow label="Mental Stress" value={stress} onChange={setStress} lowLabel="Calm" highLabel="Pressured" />
                    <SliderRow label="Self-Discipline" value={discipline} onChange={setDiscipline} lowLabel="Impulsive" highLabel="Locked-in" />

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Pre-Shift Focus Notes</label>
                      <textarea
                        value={preNotes}
                        onChange={(event) => setPreNotes(event.target.value)}
                        placeholder="Example: Only London Open, max two trades, no revenge entries."
                        className="h-28 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm font-medium leading-6 text-white outline-none transition placeholder:text-[#5A5A80] focus:border-[#F0B429]"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className={`rounded-[1.75rem] border ${riskStyle.border} ${riskStyle.bg} p-5 ${riskStyle.glow}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A0A0C0]">Trading Permission</p>
                          <h3 className={`mt-1 text-2xl font-black tracking-tight ${riskStyle.text}`}>{riskDiagnosis.clearance}</h3>
                        </div>
                        {riskDiagnosis.tone === "danger" ? <ShieldAlert className={riskStyle.text} size={30} /> : <ShieldCheck className={riskStyle.text} size={30} />}
                      </div>
                      <p className="mt-4 text-xs leading-6 text-zinc-200">{riskDiagnosis.advice}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <MetricTile label="Max Trades" value={`${riskDiagnosis.maxTrades}`} icon={<Target size={14} />} />
                      <MetricTile label="Size Rule" value={riskDiagnosis.sizeRule} icon={<Gauge size={14} />} />
                    </div>

                    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                      <div className="flex items-center gap-2 text-[#F0B429]">
                        <TimerReset size={14} />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">Stop Rule</p>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-zinc-300">{riskDiagnosis.stopRule}</p>
                    </div>

                    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                      <div className="flex items-center gap-2 text-[#F0B429]">
                        <AlertTriangle size={14} />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">Detected Leaks</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(riskDiagnosis.leaks.length ? riskDiagnosis.leaks : ["No major psychological leaks detected from today's inputs."]).map((leak) => (
                          <div key={leak} className="rounded-xl bg-[#111124] px-3 py-2 text-[11px] leading-5 text-zinc-300">
                            {leak}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <button
                        onClick={() => setScanComplete(true)}
                        className="rounded-2xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-5 py-4 text-xs font-black uppercase tracking-wider text-[#F0B429] transition hover:bg-[#F0B429]/15"
                      >
                        Run AI Risk Scan
                      </button>
                      <button
                        onClick={handleClockIn}
                        disabled={actionLoading}
                        className="gold-gradient flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-wider text-[#080810] shadow-[0_0_35px_-12px_#F0B429] transition active:scale-95 disabled:opacity-60"
                      >
                        <Clock size={15} /> {actionLoading ? "Clocking In…" : "Clock-In Session"}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-[#1E1E38] bg-[#0D0D1A]/80 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Behavior Pattern Intelligence</p>
                    <h3 className="mt-1 text-lg font-black text-white">What Risk-Guard knows so far</h3>
                  </div>
                  <Brain className="text-[#F0B429]" size={24} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Current Streak" value={journalInsights.streakType === "neutral" ? "No streak" : `${journalInsights.streak} ${journalInsights.streakType}`} icon={<Zap size={14} />} />
                  <MetricTile label="Leak Emotion" value={journalInsights.leakEmotion} icon={<Heart size={14} />} />
                  <MetricTile label="Risk Budget" value={formatShiftMoney(maxDrawdownLimit)} icon={<TrendingDown size={14} />} />
                </div>
              </Card>
            </div>

            <div className="space-y-7">
              <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-2xl shadow-black/30">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Session Reports</p>
                    <h3 className="mt-1 text-lg font-black text-white">Shift History</h3>
                  </div>
                  <Calendar size={20} className="text-[#F0B429]" />
                </div>

                {recentShifts.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[#24243C] bg-[#080810] px-5 py-10 text-center">
                    <Brain className="mx-auto text-[#F0B429]" size={30} />
                    <p className="mt-3 text-sm font-black text-white">No reports yet</p>
                    <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-[#8080A0]">
                      Your first institutional AI Risk-Guard report will appear here after you clock out.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1 no-scrollbar">
                    {recentShifts.map((shift) => {
                      const grade = shiftGrade(shift);
                      const gradeStyle = toneClasses(grade.tone);
                      return (
                        <div key={shift.id} className="rounded-[1.5rem] border border-[#24243C] bg-[#080810] p-4 shadow-inner shadow-black/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="flex items-center gap-1.5 text-xs font-bold text-[#A0A0C0]">
                                <Clock size={12} /> {new Date(shift.clockIn).toLocaleDateString()}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${gradeStyle.border} ${gradeStyle.text}`}>
                                  Grade {grade.grade}
                                </span>
                                <span className="rounded-full border border-[#1E1E38] bg-[#111124] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#F0B429]">
                                  {formatShiftDuration(getShiftDurationMinutes(shift))}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Discipline</p>
                              <p className={gradeStyle.text + " text-lg font-black"}>{shift.postDiscipline || 0}/10</p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-[#1E1E38] bg-[#101020] p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">
                              <Heart size={11} /> AI Human Analysis
                            </p>
                            <p className="line-clamp-3 text-xs leading-6 text-zinc-300">{getShiftReportSummary(shift)}</p>
                            <button
                              onClick={() => setSelectedDayShift(shift)}
                              className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-[#1C1C30]/70 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#F0B429] transition hover:bg-[#24243C]"
                            >
                              Read Full Report <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {selectedDayShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-[#24243C] bg-[#0B0B16] p-0 shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 z-10 border-b border-[#1E1E38] bg-[#0B0B16]/95 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0B429]/10 text-[#F0B429]">
                    <Brain size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Institutional Debrief</p>
                    <h3 className="text-lg font-black text-white">AI Shift Analysis — {new Date(selectedDayShift.clockIn).toLocaleDateString()}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDayShift(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1A1A26] text-zinc-400 transition hover:bg-[#24243C] hover:text-white"
                  aria-label="Close overlay"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-[1.75rem] border border-[#F0B429]/20 bg-[#14142B] p-5 shadow-[0_0_45px_-22px_#F0B429]">
                <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#F0B429]">
                  <Sparkles size={13} /> Executive Summary
                </p>
                <p className="text-sm italic leading-8 text-zinc-200">{getShiftReportSummary(selectedDayShift)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile label="Risk Grade" value={`Grade ${shiftGrade(selectedDayShift).grade}`} icon={<ShieldCheck size={14} />} />
                <MetricTile label="Discipline" value={`${selectedDayShift.postDiscipline || 0}/10`} icon={<ClipboardCheck size={14} />} />
                <MetricTile label="Stress" value={`${selectedDayShift.stressLevel || 0}/10`} icon={<Gauge size={14} />} />
                <MetricTile label="Duration" value={formatShiftDuration(getShiftDurationMinutes(selectedDayShift))} icon={<Clock size={14} />} />
                <MetricTile label="Loss Limit" value={formatShiftMoney(selectedDayShift.maxDrawdownLimit)} icon={<TrendingDown size={14} />} />
                <MetricTile label="Profit Target" value={formatShiftMoney(selectedDayShift.targetProfit)} icon={<Target size={14} />} />
                <MetricTile label="Sleep" value={`${selectedDayShift.sleepQuality || 0}/10`} icon={<Brain size={14} />} />
                <MetricTile label="Mode" value={shiftGrade(selectedDayShift).label} icon={<Zap size={14} />} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810] p-5">
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#F0B429]">
                    <ShieldAlert size={13} /> Behavioral Diagnosis
                  </p>
                  <p className="text-xs leading-6 text-zinc-300">
                    {selectedDayShift.postDiscipline && selectedDayShift.postDiscipline < 6
                      ? "The primary issue was not opportunity quality; it was self-management under pressure. The next session should prioritize fewer trades, smaller size, and a hard pause after any loss."
                      : "This session shows acceptable psychological control. The edge now comes from repeating the same process without adding unnecessary size or frequency."}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#F0B429]/20 bg-[#F0B429]/5 p-5">
                  <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#F0B429]">
                    <CheckCircle2 size={13} /> Next Session Prescription
                  </p>
                  <p className="text-xs leading-6 text-zinc-300">{prescriptionForShift(selectedDayShift)}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDayShift(null)}
                className="w-full rounded-2xl border border-[#1E1E38] bg-gradient-to-r from-[#1A1A26] to-[#222234] py-4 text-xs font-black uppercase tracking-wider text-zinc-300 transition hover:from-[#222234] hover:to-[#2A2A3A]"
              >
                Close Detailed View
              </button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
