"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { TradeForm } from "@/components/trades/TradeForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMode } from "@/components/providers/ModeProvider";
import { useRouter } from "next/navigation";
import { getAccounts, getPlaybook, getTrades } from "@/lib/db";
import {
  getModels,
  getProfile,
  saveProfile,
  getJournalTrades,
  toTrade,
  type BacktestModel,
  type BacktestProfile,
} from "@/lib/backtesting/journal";
import {
  calcStats,
  directionStats,
  formatPct,
  formatR,
  uniqueClean,
} from "@/lib/stats";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  ClipboardCheck,
  Crosshair,
  Flame,
  LineChart,
  PlusCircle,
  Shield,
  Sparkles,
  Target,
  Calendar as CalendarIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ActiveTraderCheckinModal } from "@/components/providers/ActiveTraderCheckinModal";
import { ActiveShiftTerminal } from "@/components/backtesting/ActiveShiftTerminal";
import { getActiveShift, TraderShift } from "@/lib/shifts-db";
import { FeatureAnnouncementBanner } from "@/components/providers/FeatureAnnouncementBanner";

type TimeRange = "all" | "7d" | "30d" | "90d";
type PnlViewMode = "r" | "dollar";

const DashboardEquityChart = dynamic(
  () => import("@/components/charts/DashboardEquityChart"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#1E1E38] bg-[#070712] text-xs text-[#5A5A80]">
        Loading chart…
      </div>
    ),
  }
);

/* ============================================================
   DEMO DATA — shown when user has zero real trades
   ============================================================ */
const DEMO_TRADES: Trade[] = [
  { id: "demo-1", date: "2026-06-16", instrument: "NQ", direction: "LONG", setup: "London ORB", session: "London", result: 2.4, pnl: 480, account: "FTMO 50K", reviewed: true, executionRating: 5, tags: "A+" },
  { id: "demo-2", date: "2026-06-16", instrument: "ES", direction: "SHORT", setup: "FVG Retest", session: "NY", result: -1.0, pnl: -200, account: "FTMO 50K", reviewed: true, executionRating: 3, mistake: "Chased entry", tags: "emotional" },
  { id: "demo-3", date: "2026-06-17", instrument: "XAUUSD", direction: "LONG", setup: "Liquidity Sweep", session: "London", result: 1.8, pnl: 360, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "patient" },
  { id: "demo-4", date: "2026-06-17", instrument: "EURUSD", direction: "SHORT", setup: "NY Open Drive", session: "NY", result: 1.1, pnl: 220, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "followed plan" },
  { id: "demo-5", date: "2026-06-18", instrument: "NQ", direction: "LONG", setup: "London ORB", session: "London", result: -0.5, pnl: -100, account: "FTMO 50K", reviewed: true, executionRating: 3, mistake: "Moved stop", tags: "discipline" },
  { id: "demo-6", date: "2026-06-18", instrument: "BTCUSD", direction: "SHORT", setup: "Range Fade", session: "NY", result: 3.2, pnl: 640, account: "FTMO 50K", reviewed: true, executionRating: 5, tags: "A+" },
  { id: "demo-7", date: "2026-06-19", instrument: "ES", direction: "LONG", setup: "VWAP Bounce", session: "NY", result: 0.8, pnl: 160, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "scalp" },
  { id: "demo-8", date: "2026-06-19", instrument: "GBPJPY", direction: "SHORT", setup: "Supply Zone", session: "London", result: -1.0, pnl: -200, account: "FTMO 50K", reviewed: true, executionRating: 2, mistake: "News spike", tags: "avoid news" },
  { id: "demo-9", date: "2026-06-20", instrument: "NQ", direction: "LONG", setup: "London ORB", session: "London", result: 2.1, pnl: 420, account: "FTMO 50K", reviewed: true, executionRating: 5, tags: "A+" },
  { id: "demo-10", date: "2026-06-20", instrument: "US30", direction: "SHORT", setup: "Breaker Block", session: "NY", result: 1.6, pnl: 320, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "clean" },
  { id: "demo-11", date: "2026-06-23", instrument: "XAUUSD", direction: "LONG", setup: "Liquidity Sweep", session: "London", result: -0.3, pnl: -60, account: "FTMO 50K", reviewed: true, executionRating: 3, mistake: "Late entry", tags: "FOMO" },
  { id: "demo-12", date: "2026-06-23", instrument: "DAX", direction: "LONG", setup: "London ORB", session: "London", result: 1.5, pnl: 300, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "disciplined" },
  { id: "demo-13", date: "2026-06-24", instrument: "NQ", direction: "SHORT", setup: "FVG Retest", session: "NY", result: -1.2, pnl: -240, account: "FTMO 50K", reviewed: true, executionRating: 2, mistake: "Revenge trade", tags: "emotional" },
  { id: "demo-14", date: "2026-06-24", instrument: "ES", direction: "LONG", setup: "NY Open Drive", session: "NY", result: 0.9, pnl: 180, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "momentum" },
  { id: "demo-15", date: "2026-06-25", instrument: "EURUSD", direction: "SHORT", setup: "Range Fade", session: "London", result: 2.7, pnl: 540, account: "FTMO 50K", reviewed: true, executionRating: 5, tags: "A+" },
  { id: "demo-16", date: "2026-06-25", instrument: "BTCUSD", direction: "LONG", setup: "Trend Pullback", session: "NY", result: -0.8, pnl: -160, account: "FTMO 50K", reviewed: true, executionRating: 3, mistake: "Wrong timeframe", tags: "check HTF" },
  { id: "demo-17", date: "2026-06-26", instrument: "NQ", direction: "LONG", setup: "London ORB", session: "London", result: 1.9, pnl: 380, account: "FTMO 50K", reviewed: true, executionRating: 5, tags: "A+" },
  { id: "demo-18", date: "2026-06-26", instrument: "XAUUSD", direction: "SHORT", setup: "Supply Zone", session: "NY", result: 0.6, pnl: 120, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "patient" },
  { id: "demo-19", date: "2026-06-27", instrument: "ES", direction: "LONG", setup: "VWAP Bounce", session: "NY", result: -0.4, pnl: -80, account: "FTMO 50K", reviewed: true, executionRating: 3, mistake: "Low conviction", tags: "skip" },
  { id: "demo-20", date: "2026-06-27", instrument: "NQ", direction: "SHORT", setup: "FVG Retest", session: "London", result: 1.3, pnl: 260, account: "FTMO 50K", reviewed: true, executionRating: 4, tags: "clean" },
];

function DemoBanner({ onLogTrade }: { onLogTrade: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/10 p-4 shadow-lg"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,180,41,0.15),transparent_50%)]" />
      <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0B429]/20 text-[#F0B429]">
            <BarChart3 size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              Previewing demo data
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[#A0A0C0]">
              This is sample data so you can explore the dashboard. Log your
              first real trade and this preview will be replaced with your
              actual performance.
            </p>
          </div>
        </div>
        <button
          onClick={onLogTrade}
          className="shrink-0 rounded-xl bg-[#F0B429] px-4 py-2.5 text-xs font-bold text-[#080810] transition hover:bg-[#d99f1e]"
        >
          Log First Trade →
        </button>
      </div>
    </motion.div>
  );
}

type TradingState = {
  label: string;
  tone: "green" | "gold" | "red";
  headline: string;
  advice: string;
};

function getTradingState({
  stats,
  edgeScore,
  openTrades,
}: {
  stats: ReturnType<typeof calcStats>;
  edgeScore: number;
  openTrades: number;
}): TradingState {
  if (openTrades > 2) {
    return {
      label: "Exposure Watch",
      tone: "red",
      headline: "Too many open decisions.",
      advice: "Reduce decision-load before adding another position. Manage open exposure first.",
    };
  }

  if (stats.streak <= -2 || stats.maxDD >= 3 || edgeScore < 40) {
    return {
      label: "Caution",
      tone: "red",
      headline: "Protect capital first.",
      advice: "Trade smaller, take only A+ setups, and use AI Risk-Guard before the next session.",
    };
  }

  if (stats.expectancy <= 0 || stats.profitFactor < 1 || edgeScore < 62) {
    return {
      label: "Review Mode",
      tone: "gold",
      headline: "Edge needs confirmation.",
      advice: "Focus on your best setup and stop trading anything with weak expectancy.",
    };
  }

  return {
    label: "Cleared",
    tone: "green",
    headline: "Execution window is healthy.",
    advice: "Keep risk fixed, repeat your best playbook, and do not increase size emotionally.",
  };
}

function toneClass(tone: "green" | "gold" | "red") {
  if (tone === "green") return { text: "text-[#00D084]", bg: "bg-[#00D084]/10", border: "border-[#00D084]/35", glow: "shadow-[0_0_45px_-20px_#00D084]" };
  if (tone === "red") return { text: "text-[#FF4565]", bg: "bg-[#FF4565]/10", border: "border-[#FF4565]/35", glow: "shadow-[0_0_45px_-20px_#FF4565]" };
  return { text: "text-[#F0B429]", bg: "bg-[#F0B429]/10", border: "border-[#F0B429]/35", glow: "shadow-[0_0_45px_-20px_#F0B429]" };
}

function signedDollar(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildAiDeskInsight({
  stats,
  bestSetup,
  worstSetup,
  hasDollarData,
  isDemo,
}: {
  stats: ReturnType<typeof calcStats>;
  bestSetup: string;
  worstSetup: string;
  hasDollarData: boolean;
  isDemo: boolean;
}) {
  if (isDemo) {
    return "You are viewing demo telemetry. Log your first real trade to unlock personalized AI desk guidance.";
  }
  if (!stats.count) {
    return "No closed trades yet. Start by logging three clean trades with setup, risk, emotion, and lesson so ProfitPnL can identify your edge.";
  }
  if (stats.expectancy > 0 && stats.profitFactor >= 1.25) {
    return `Your edge is forming around ${bestSetup}. Keep size consistent and protect this pattern from overtrading.`;
  }
  if (worstSetup !== "No major leak") {
    return `${worstSetup} is dragging performance. Review screenshots and rules before taking that setup again.`;
  }
  if (!hasDollarData) {
    return "Your R tracking is active, but dollar P&L is missing on some trades. Add P&L to make risk telemetry more institutional.";
  }
  return "Your journal is building. The next improvement is tighter tagging: setup, session, mistake, emotion, and review status on every trade.";
}

function TradingHQHero({
  traderName,
  isBacktest,
  stats,
  dollarProfit,
  hasDollarData,
  tradesMissingPnl,
  edgeScore,
  grade,
  gradeColor,
  bestSetup,
  worstSetup,
  openTrades,
  isDemo,
  onLogTrade,
  onOpenRiskGuard,
  onOpenAnalytics,
  onOpenDailyPlan,
}: {
  traderName: string;
  isBacktest: boolean;
  stats: ReturnType<typeof calcStats>;
  dollarProfit: number;
  hasDollarData: boolean;
  tradesMissingPnl: number;
  edgeScore: number;
  grade: string;
  gradeColor: string;
  bestSetup: string;
  worstSetup: string;
  openTrades: number;
  isDemo: boolean;
  onLogTrade: () => void;
  onOpenRiskGuard: () => void;
  onOpenAnalytics: () => void;
  onOpenDailyPlan: () => void;
}) {
  const state = getTradingState({ stats, edgeScore, openTrades });
  const stateStyle = toneClass(state.tone);
  const aiInsight = buildAiDeskInsight({ stats, bestSetup, worstSetup, hasDollarData, isDemo });
  const edgeProgress = Math.max(3, Math.min(100, edgeScore));

  return (
    <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(240,180,41,0.18),transparent_35%),radial-gradient(circle_at_86%_0%,rgba(0,208,132,0.10),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#F0B429]/70 to-transparent" />

      <div className="relative grid gap-7 p-5 sm:p-7 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
              <Sparkles size={12} /> {isBacktest ? "Backtesting HQ" : "Trading HQ"}
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${stateStyle.border} ${stateStyle.bg} ${stateStyle.text}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" /> {state.label}
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white sm:text-5xl">
              Welcome back, {traderName}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
              Your command center for edge quality, risk posture, recent execution, and the next action that protects your capital.
            </p>
          </div>

          <div className={`rounded-[1.5rem] border ${stateStyle.border} ${stateStyle.bg} p-4 ${stateStyle.glow}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/20 ${stateStyle.text}`}>
                <Brain size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A0A0C0]">AI Desk Briefing</p>
                <h3 className="mt-1 text-base font-black text-white">{state.headline}</h3>
                <p className="mt-1 text-xs leading-6 text-zinc-300">{aiInsight} {state.advice}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <HQActionButton icon={<PlusCircle size={15} />} label="Log Trade" onClick={onLogTrade} primary />
            <HQActionButton icon={<ClipboardCheck size={15} />} label="Daily Plan" onClick={onOpenDailyPlan} />
            <HQActionButton icon={<Shield size={15} />} label="Risk Guard" onClick={onOpenRiskGuard} />
            <HQActionButton icon={<BarChart3 size={15} />} label="Analytics" onClick={onOpenAnalytics} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Edge Rating</p>
              <p className="mt-1 text-4xl font-black tracking-tighter" style={{ color: gradeColor }}>Grade {grade}</p>
            </div>
            <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${gradeColor} ${edgeProgress * 3.6}deg, #1E1E38 0deg)` }}>
              <div className="absolute inset-2 rounded-full bg-[#080810]" />
              <span className="relative text-xl font-black" style={{ color: gradeColor }}>{Math.round(edgeScore)}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <HQMiniStat label="Net P&L" value={hasDollarData ? signedDollar(dollarProfit) : "No $"} tone={hasDollarData ? (dollarProfit >= 0 ? "green" : "red") : "gold"} />
            <HQMiniStat label="Total R" value={formatR(stats.totalR)} tone={stats.totalR >= 0 ? "green" : "red"} />
            <HQMiniStat label="Win Rate" value={stats.count ? formatPct(stats.winRate) : "—"} tone="gold" />
            <HQMiniStat label="Open Risk" value={`${openTrades} open`} tone={openTrades > 2 ? "red" : openTrades > 0 ? "gold" : "green"} />
          </div>

          <div className="mt-4 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-[#8080A0]">Best setup</span>
              <span className="max-w-[150px] truncate font-black text-[#00D084]" title={bestSetup}>{bestSetup}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-[#8080A0]">Review focus</span>
              <span className="max-w-[150px] truncate font-black text-[#F0B429]" title={worstSetup}>{worstSetup}</span>
            </div>
            {tradesMissingPnl > 0 && (
              <p className="mt-3 text-[10px] leading-5 text-[#8080A0]">
                {tradesMissingPnl} trade{tradesMissingPnl === 1 ? "" : "s"} missing dollar P&L.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HQActionButton({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider transition active:scale-95",
        primary
          ? "gold-gradient text-[#080810] shadow-[0_0_30px_-12px_#F0B429]"
          : "border border-[#1E1E38] bg-[#111124] text-[#A0A0C0] hover:border-[#F0B429]/40 hover:text-white",
      ].join(" ")}
    >
      {icon} {label}
    </button>
  );
}

function HQMiniStat({ label, value, tone }: { label: string; value: string; tone: "green" | "gold" | "red" }) {
  const colors = toneClass(tone);
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#5A5A80]">{label}</p>
      <p className={`mt-1 truncate text-sm font-black ${colors.text}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, displayName } = useAuth();
  const { mode } = useMode();
  const isBacktest = mode === "backtest";
  const router = useRouter();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Backtesting-mode state
  const [models, setModels] = useState<BacktestModel[]>([]);
  const [, setProfile] = useState<BacktestProfile | null>(null);
  const [acct, setAcct] = useState("0");
  const [acctCurrency, setAcctCurrency] = useState("USD");
  const [savingAcct, setSavingAcct] = useState(false);

  // Active Live Shift state for direct cockpit rendering
  const [shiftData, setShiftData] = useState<TraderShift | null>(null);

  // Modal State for Log Trade
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  const [accountFilter, setAccountFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [calendarView, setCalendarView] = useState<PnlViewMode>("r");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const activeShift = await getActiveShift(user.id);
      setShiftData(activeShift);

      if (isBacktest) {
        const [m, p] = await Promise.all([getModels(), getProfile()]);
        setModels(m);
        setProfile(p);
        setAcct(p ? String(p.account_size) : "0");
        setAcctCurrency(p ? p.currency : "USD");
        const all = [await getJournalTrades()];
        const flat = all.flat();
        const mapped = flat
          .map((t) => {
            const model = m.find((x) => x.id === t.session_id);
            return model ? toTrade(t, model) : null;
          })
          .filter((x): x is Trade => x !== null);
        setTrades(mapped);
        setAccounts([]);
        setPlaybook([]);
        setIsDemo(false);
      } else {
        const [tradeRows, accountRows, playbookRows] = await Promise.all([
          getTrades(user.id),
          getAccounts(user.id),
          getPlaybook(user.id),
        ]);

        setTrades(tradeRows);
        setAccounts(accountRows);
        setPlaybook(playbookRows);
        // Enable demo mode only when user has zero real trades
        setIsDemo(tradeRows.length === 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode]);

  async function handleSaveAcct() {
    setSavingAcct(true);
    try {
      await saveProfile(Number(acct) || 0, acctCurrency);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAcct(false);
    }
  }

  const effectiveTrades = useMemo(() => {
    return isDemo ? DEMO_TRADES : trades;
  }, [isDemo, trades]);

  const accountNames = useMemo(() => {
    return uniqueClean([
      ...accounts.map((a) => a.name),
      ...effectiveTrades.map((t) => t.account),
    ]);
  }, [accounts, effectiveTrades]);

  const strategyNames = useMemo(() => {
    return uniqueClean([
      ...playbook.map((p) => p.name),
      ...effectiveTrades.map((t) => t.setup),
    ]);
  }, [playbook, effectiveTrades]);

  const filteredTrades = useMemo(() => {
    return effectiveTrades.filter((trade) => {
      if (accountFilter && trade.account !== accountFilter) return false;
      if (strategyFilter && trade.setup !== strategyFilter) return false;
      if (!withinTimeRange(trade, timeRange)) return false;
      return true;
    });
  }, [effectiveTrades, accountFilter, strategyFilter, timeRange]);

  const stats = useMemo(() => calcStats(filteredTrades), [filteredTrades]);
  const dir = useMemo(() => directionStats(filteredTrades), [filteredTrades]);
  const equityChartData = useMemo(
    () => buildEquityChartData(filteredTrades),
    [filteredTrades]
  );

  const openTrades = useMemo(() => {
    return filteredTrades.filter((t) => !hasResult(t));
  }, [filteredTrades]);

  // Dollar P&L only ever reflects trades where a $ amount was actually
  // logged (trade.pnl). Trades with no $ entered are excluded from this
  // total rather than estimated from their R result — so this number
  // never invents a dollar figure that wasn't actually recorded.
  const tradesWithPnl = filteredTrades.filter(
    (t) => t.pnl !== "" && t.pnl !== null && t.pnl !== undefined
  );

  const tradesMissingPnl = filteredTrades.length - tradesWithPnl.length;

  const dollarProfit = tradesWithPnl.reduce(
    (sum, trade) => sum + Number(trade.pnl || 0),
    0
  );

  const edgeScore = useMemo(() => {
    return calculateEdgeScore(
      stats.count,
      stats.winRate,
      stats.expectancy,
      stats.profitFactor
    );
  }, [stats.count, stats.winRate, stats.expectancy, stats.profitFactor]);

  const grade = getGrade(edgeScore);
  const gradeColor = getGradeColor(edgeScore);

  const setupRows = useMemo(
    () => getSetupPerformance(filteredTrades),
    [filteredTrades]
  );

  const bestSetup = setupRows[0];
  const worstSetup = setupRows.slice().reverse()[0];

  const recentTrades = filteredTrades
    .slice()
    .sort(
      (a, b) =>
        new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
    )
    .slice(0, 6);

  return (
    <AppShell
      title={isBacktest ? "Backtesting HQ" : shiftData ? "AI Co-pilot Active Terminal" : "Trading HQ"}
      subtitle={
        isBacktest
          ? `${models.length} models · ${trades.length} backtested trades`
          : shiftData 
            ? "Your active, real-time strategy verification co-pilot"
            : "Your trading command center"
      }
      actionLabel={isBacktest ? "+ New Model" : shiftData ? undefined : "+ Log New Trade"}
      onAction={
        isBacktest
          ? () => router.push("/playbook")
          : shiftData
            ? undefined
            : () => setTradeModalOpen(true)
      }
    >
      {/* Log Trade Modal */}
      <ActiveTraderCheckinModal />
      <FeatureAnnouncementBanner />
      
      {!isBacktest && tradeModalOpen && user && (
        <Modal
          isOpen={tradeModalOpen}
          onClose={() => setTradeModalOpen(false)}
          title="Log Trade Execution"
        >
          <TradeForm
            uid={user.id}
            accounts={accounts}
            playbook={playbook}
            strategiesFromTrades={strategyNames}
            onSaved={() => {
              setTradeModalOpen(false);
              loadData();
            }}
            onCancel={() => setTradeModalOpen(false)}
          />
        </Modal>
      )}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]">
          Loading performance analytics…
        </div>
      ) : shiftData && !isBacktest ? (
        <ActiveShiftTerminal activeShift={shiftData} onStateChange={loadData} />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {isDemo && (
            <DemoBanner onLogTrade={() => setTradeModalOpen(true)} />
          )}

          {/* --- BACKTESTING ACCOUNT SIZE HERO --- */}
          {isBacktest && (
            <Card className="overflow-hidden border-[#1E1E38]">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0B429]/10 text-[#F0B429]">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8080A0]">
                      Account Size
                    </p>
                    <p className="text-sm text-[#8080A0]">
                      The simulated account you backtest against.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3">
                    <span className="text-sm font-bold text-[#F0B429]">
                      {acctCurrency === "USD" ? "$" : acctCurrency}
                    </span>
                    <input
                      value={acct}
                      onChange={(e) =>
                        setAcct(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      inputMode="decimal"
                      className="w-28 bg-transparent px-2 py-2.5 text-sm font-bold text-white outline-none"
                    />
                  </div>
                  <select
                    value={acctCurrency}
                    onChange={(e) => setAcctCurrency(e.target.value)}
                    className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-3 text-sm text-white outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                    <option value="JPY">JPY</option>
                  </select>
                  <button
                    onClick={handleSaveAcct}
                    disabled={savingAcct}
                    className="rounded-xl bg-[#F0B429] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#d99f1e] disabled:opacity-40"
                  >
                    {savingAcct ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* --- TRADING HQ EXECUTIVE COMMAND CENTER --- */}
          <TradingHQHero
            traderName={displayName || user?.email?.split("@")[0] || "Trader"}
            isBacktest={isBacktest}
            stats={stats}
            dollarProfit={dollarProfit}
            hasDollarData={tradesWithPnl.length > 0}
            tradesMissingPnl={tradesMissingPnl}
            edgeScore={edgeScore}
            grade={grade}
            gradeColor={gradeColor}
            bestSetup={bestSetup?.name || stats.bestSetup || "No setup yet"}
            worstSetup={
              worstSetup?.totalR && worstSetup.totalR < 0
                ? worstSetup.name
                : "No major leak"
            }
            openTrades={openTrades.length}
            isDemo={isDemo}
            onLogTrade={() => setTradeModalOpen(true)}
            onOpenRiskGuard={() => router.push("/psychology/guard")}
            onOpenAnalytics={() => router.push("/analytics")}
            onOpenDailyPlan={() => router.push("/daily-plan")}
          />

          {/* --- INTERACTIVE EQUITY CURVE & RISK DESK (MOVED TO TOP) --- */}
          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="flex min-w-0 flex-col justify-between overflow-hidden border-[#1E1E38] bg-[#0D0D1A] p-6 shadow-lg transition-all hover:border-[#3A3A5A]">
              <div className="mb-5 flex flex-col justify-between gap-4 border-b border-[#1E1E38] pb-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-bold text-white">
                    <LineChart size={18} className="shrink-0 text-[#F0B429]" />
                    <span className="truncate">
                      Cumulative Equity Performance
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#8080A0]">
                    Move cursor along the chart to inspect trade equity
                    snapshots · {stats.count} closed trades
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div
                    className={[
                      "whitespace-nowrap rounded-lg border px-3.5 py-1 text-sm font-bold tabular-nums shadow-inner",
                      stats.totalR >= 0
                        ? "border-[#00D084]/30 bg-[#00D084]/15 text-[#00D084]"
                        : "border-[#FF4565]/30 bg-[#FF4565]/15 text-[#FF4565]",
                    ].join(" ")}
                  >
                    {formatR(stats.totalR)}
                  </div>
                </div>
              </div>

              <div className="relative h-80 overflow-hidden rounded-xl border border-[#1E1E38] bg-[#070712] p-4">
                {equityChartData.length ? (
                  <DashboardEquityChart data={equityChartData} />
                ) : (
                  <EmptyMini message="Log closed trades to generate your equity chart." />
                )}
              </div>
            </Card>

            <RiskDesk
              maxDD={stats.maxDD}
              streak={stats.streak}
              openTrades={openTrades.length}
              expectancy={stats.expectancy}
              profitFactor={stats.profitFactor}
            />
          </section>

          {/* --- SLEEK FILTERS BAR --- */}
          <DashboardFilters
            accountNames={accountNames}
            strategyNames={strategyNames}
            accountFilter={accountFilter}
            strategyFilter={strategyFilter}
            timeRange={timeRange}
            totalTrades={effectiveTrades.length}
            filteredTrades={filteredTrades.length}
            onAccountChange={setAccountFilter}
            onStrategyChange={setStrategyFilter}
            onTimeRangeChange={setTimeRange}
            onClear={() => {
              setAccountFilter("");
              setStrategyFilter("");
              setTimeRange("all");
            }}
          />

          {/* --- EXACT MONTHLY P&L CALENDAR HEATMAP & EDGE SCORE CARD --- */}
          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <ExactMonthlyCalendarHeatmap
              trades={filteredTrades}
              viewMode={calendarView}
              onViewModeChange={setCalendarView}
            />

            <RedesignedEdgeScoreCard
              score={edgeScore}
              grade={grade}
              gradeColor={gradeColor}
              stats={stats}
              bestSetup={bestSetup?.name || "None yet"}
              worstSetup={
                worstSetup?.totalR && worstSetup.totalR < 0
                  ? worstSetup.name
                  : "None detected"
              }
              hasDollarData={tradesWithPnl.length > 0}
              dollarProfit={dollarProfit}
            />
          </section>

          {/* --- DIRECTION ALLOCATION, SETUP INTELLIGENCE, & NEXT ACTION --- */}
          <section className="grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <DirectionAllocation
              longR={dir.long.totalR}
              shortR={dir.short.totalR}
              longCount={dir.long.count}
              shortCount={dir.short.count}
              longWR={dir.long.winRate}
              shortWR={dir.short.winRate}
            />

            <SetupIntelligence best={bestSetup} worst={worstSetup} />

            <NextActionCard
              stats={stats}
              bestSetup={bestSetup}
              worstSetup={worstSetup}
              openTrades={openTrades.length}
            />
          </section>

          {/* --- STRATEGY BOARD & EXECUTION FEED --- */}
          <section className="grid min-w-0 gap-6 xl:grid-cols-2">
            <Card className="min-w-0 border-[#1E1E38] p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
                <div className="flex min-w-0 items-center gap-2 text-base font-bold text-white">
                  <Crosshair size={18} className="shrink-0 text-[#F0B429]" />
                  <span className="truncate">Strategy Performance</span>
                </div>
                <span className="shrink-0 text-xs text-[#8080A0]">
                  Ranked by total return
                </span>
              </div>

              {setupRows.length ? (
                <div className="space-y-3.5">
                  {setupRows.slice(0, 5).map((row) => (
                    <SetupRow key={row.name} row={row} />
                  ))}
                </div>
              ) : (
                <EmptyMini message="Add setups in Playbook or assign setups to trades." />
              )}
            </Card>

            <Card className="min-w-0 border-[#1E1E38] p-6 shadow-lg">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-bold text-white">
                    <Layers size={18} className="shrink-0 text-[#00D084]" />
                    <span className="truncate">Recent Trade Log</span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#8080A0]">
                    Latest trades matching active filters
                  </div>
                </div>
              </div>

              {recentTrades.length ? (
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <RecentTradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              ) : (
                <EmptyMini message="No trade executions logged in this view." />
              )}
            </Card>
          </section>
        </motion.div>
      )}
    </AppShell>
  );
}

/* ============================================================
   EXACT MONTHLY P&L CALENDAR HEATMAP (WITH MONTH SWITCHER)
   ============================================================ */
type CalendarCell =
  | { type: "empty"; key: string }
  | {
      type: "day";
      key: string;
      day: number;
      dateStr: string;
      trades: Trade[];
      count: number;
      r: number;
      dollar: number;
      dollarTradeCount: number; // how many of this day's trades have a logged $ value
      hasUntrackedDollar: boolean; // true if some trades this day have no $ logged
    };

// Returns a trade's dollar P&L only if it was actually logged — never
// invents a dollar figure from the R result. Returns null when the
// trade has no $ value entered, so callers can exclude it from totals
// instead of silently guessing (e.g. via a flat/default risk amount).
function tradeDollarOrNull(trade: Trade): number | null {
  if (trade.pnl !== "" && trade.pnl !== null && trade.pnl !== undefined) {
    const parsed = Number(trade.pnl);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatDollarCompact(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

// Shorter R label for tight spaces (e.g. mobile calendar cells), using 1
// decimal instead of formatR's 2 — "+2.4R" instead of "+2.40R" — so it
// actually fits in a narrow 7-column grid cell instead of truncating to
// "+2....".
function formatRCompact(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}R`;
}

function formatDollarFull(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type EquityChartPoint = {
  name: string;
  trade: number;
  equity: number;
  r: number;
  instrument: string;
  strategy: string;
};

// Same approach as the Performance page's equity curve (buildEquityCurve in
// app/analytics/page.tsx): sort closed trades chronologically, accumulate a
// running R total, and label each point with a short date + trade metadata
// for the tooltip — instead of a bare list of numbers.
function buildEquityChartData(trades: Trade[]): EquityChartPoint[] {
  let runningR = 0;

  const closed = trades
    .filter(hasResult)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
    );

  return closed.map((trade, index) => {
    runningR += Number(trade.result || 0);

    const parsedDate = trade.date ? new Date(trade.date) : null;

    return {
      name:
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("en-AU", {
              day: "2-digit",
              month: "short",
            })
          : `#${index + 1}`,
      trade: index + 1,
      equity: Number(runningR.toFixed(2)),
      r: Number(trade.result || 0),
      instrument: trade.instrument || "—",
      strategy: trade.setup || "—",
    };
  });
}

function ExactMonthlyCalendarHeatmap({
  trades,
  viewMode,
  onViewModeChange,
}: {
  trades: Trade[];
  viewMode: PnlViewMode;
  onViewModeChange: (mode: PnlViewMode) => void;
}) {
  // State for current displayed month
  const [displayDate, setDisplayDate] = useState(() => new Date());

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth(); // 0-indexed

  const monthName = displayDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Calculate calendar grid cells
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday as first day of week (0 = Mon, 6 = Sun)
    let startDayWeek = firstDayOfMonth.getDay() - 1;
    if (startDayWeek < 0) startDayWeek = 6;

    const cells: CalendarCell[] = [];
    // Padding for days before the 1st
    for (let i = 0; i < startDayWeek; i++) {
      cells.push({ type: "empty", key: `pad-prev-${i}` });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      // Filter exact trades that occurred on this specific YYYY-MM-DD
      const dayTrades = trades.filter((t) => t.date === dateStr);
      const dayR = dayTrades.reduce((sum, t) => sum + Number(t.result || 0), 0);

      // Dollar total only counts trades where a $ P&L was actually logged —
      // trades without one are excluded, never estimated from R.
      const dayDollarValues = dayTrades
        .map((t) => tradeDollarOrNull(t))
        .filter((v): v is number => v !== null);
      const dayDollar = dayDollarValues.reduce((sum, v) => sum + v, 0);

      cells.push({
        type: "day",
        key: `day-${day}`,
        day,
        dateStr,
        trades: dayTrades,
        count: dayTrades.length,
        r: dayR,
        dollar: dayDollar,
        dollarTradeCount: dayDollarValues.length,
        hasUntrackedDollar: dayDollarValues.length < dayTrades.length,
      });
    }

    // Padding for end of grid (make total length multiple of 7)
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      cells.push({ type: "empty", key: `pad-next-${i}` });
    }

    return cells;
  }, [trades, year, month]);

  // Compute month summary statistics
  const monthStats = useMemo(() => {
    let winDays = 0;
    let lossDays = 0;
    let totalMonthR = 0;
    let totalMonthDollar = 0;
    let totalMonthTrades = 0;
    let tradesMissingDollar = 0;

    for (const cell of calendarCells) {
      if (cell.type === "day" && cell.count > 0) {
        totalMonthTrades += cell.count;
        totalMonthR += cell.r;
        totalMonthDollar += cell.dollar;
        tradesMissingDollar += cell.count - cell.dollarTradeCount;

        const dayResult = viewMode === "dollar" ? cell.dollar : cell.r;
        if (dayResult > 0) winDays++;
        if (dayResult < 0) lossDays++;
      }
    }

    return {
      winDays,
      lossDays,
      totalMonthR,
      totalMonthDollar,
      totalMonthTrades,
      tradesMissingDollar,
    };
  }, [calendarCells, viewMode]);

  const handlePrevMonth = () => {
    setDisplayDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setDisplayDate(new Date());
  };

  return (
    <Card className="flex min-w-0 flex-col justify-between border-[#1E1E38] bg-[#111124] p-3 shadow-lg sm:p-6">
      <div>
        {/* Calendar Header with Exact Month Switcher */}
        <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#1E1E38] pb-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <CalendarIcon size={18} className="shrink-0 text-[#F0B429]" />
              <span className="truncate">Daily P&L Calendar</span>
            </div>
            <p className="mt-0.5 text-xs text-[#8080A0]">
              Net result & execution frequency matched to your logged trade
              dates
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* R / $ View Toggle */}
            <div className="flex items-center gap-0.5 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-1">
              <button
                onClick={() => onViewModeChange("r")}
                aria-pressed={viewMode === "r"}
                className={[
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
                  viewMode === "r"
                    ? "bg-[#F0B429] text-[#080810]"
                    : "text-[#A0A0C0] hover:text-white",
                ].join(" ")}
              >
                R
              </button>
              <button
                onClick={() => onViewModeChange("dollar")}
                aria-pressed={viewMode === "dollar"}
                className={[
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
                  viewMode === "dollar"
                    ? "bg-[#F0B429] text-[#080810]"
                    : "text-[#A0A0C0] hover:text-white",
                ].join(" ")}
              >
                $
              </button>
            </div>

            {/* Month Switcher Controls */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-1">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="rounded-lg p-1.5 text-[#A0A0C0] transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleToday}
                title="Jump to current month"
                className="whitespace-nowrap px-3 py-1 text-xs font-bold text-white transition-colors hover:text-[#F0B429]"
              >
                {monthName}
              </button>
              <button
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="rounded-lg p-1.5 text-[#A0A0C0] transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Day of Week Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-wide text-[#8080A0] sm:gap-2 sm:text-[11px]">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* Exact Month Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell) => {
            if (cell.type === "empty") {
              return (
                <div
                  key={cell.key}
                  className="h-12 rounded-lg border border-transparent bg-white/[0.01] sm:h-16 sm:rounded-xl"
                />
              );
            }

            // In $ view, a day where none of its trades have a logged
            // dollar amount has no data to show — distinguish that from
            // an actual $0 result, so it never looks like a breakeven day.
            const dollarUntracked =
              viewMode === "dollar" && cell.count > 0 && cell.dollarTradeCount === 0;

            const cellValue = viewMode === "dollar" ? cell.dollar : cell.r;
            const isWin = !dollarUntracked && cellValue > 0;
            const isLoss = !dollarUntracked && cellValue < 0;
            const cellLabel = dollarUntracked
              ? "No $"
              : viewMode === "dollar"
                ? formatDollarCompact(cellValue)
                : formatRCompact(cellValue);
            const titleLabel = dollarUntracked
              ? "No $ logged for this trade"
              : viewMode === "dollar"
                ? formatDollarFull(cellValue)
                : formatR(cellValue);

            return (
              <div
                key={cell.key}
                className={[
                  "relative flex h-12 min-w-0 flex-col items-center justify-between overflow-hidden rounded-lg border p-0.5 transition-all hover:border-white/40 sm:h-16 sm:rounded-xl sm:p-1.5",
                  isWin
                    ? "border-[#00D084]/40 bg-[#00D084]/15 text-[#00D084]"
                    : isLoss
                    ? "border-[#FF4565]/40 bg-[#FF4565]/15 text-[#FF4565]"
                    : "border-[#1E1E38] bg-[#161628] text-[#8080A0]",
                ].join(" ")}
                title={
                  cell.count > 0
                    ? dollarUntracked
                      ? `${cell.dateStr}: no $ logged for ${cell.count} ${
                          cell.count === 1 ? "trade" : "trades"
                        }`
                      : `${cell.dateStr}: ${titleLabel} across ${
                          cell.count
                        } ${cell.count === 1 ? "trade" : "trades"}`
                    : `${cell.dateStr}: No trades`
                }
              >
                <span className="self-start text-[9px] font-medium opacity-70 sm:text-[11px]">
                  {cell.day}
                </span>
                {cell.count > 0 ? (
                  <div className="w-full pb-0.5 text-center">
                    <div className="truncate text-[9px] font-bold tracking-tight tabular-nums sm:text-sm sm:tracking-normal">
                      {cellLabel}
                    </div>
                    <div className="hidden truncate text-[9px] font-normal opacity-75 sm:block">
                      {cell.count} {cell.count === 1 ? "trade" : "trades"}
                    </div>
                  </div>
                ) : (
                  <span className="pb-1 text-[11px] opacity-20">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#1E1E38] pt-3 text-xs text-[#A0A0C0]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="whitespace-nowrap font-semibold text-[#00D084]">
            ● {monthStats.winDays} Winning{" "}
            {monthStats.winDays === 1 ? "Day" : "Days"}
          </span>
          <span className="whitespace-nowrap font-semibold text-[#FF4565]">
            ● {monthStats.lossDays} Losing{" "}
            {monthStats.lossDays === 1 ? "Day" : "Days"}
          </span>
        </div>
        <div className="whitespace-nowrap font-semibold text-white">
          Monthly Total:{" "}
          <span
            className={
              (viewMode === "dollar"
                ? monthStats.totalMonthDollar
                : monthStats.totalMonthR) >= 0
                ? "text-[#00D084]"
                : "text-[#FF4565]"
            }
          >
            {viewMode === "dollar"
              ? formatDollarFull(monthStats.totalMonthDollar)
              : formatR(monthStats.totalMonthR)}
          </span>{" "}
          ({monthStats.totalMonthTrades}{" "}
          {monthStats.totalMonthTrades === 1 ? "trade" : "trades"})
          {viewMode === "dollar" && monthStats.tradesMissingDollar > 0 && (
            <span className="ml-2 text-[#8080A0]">
              · {monthStats.tradesMissingDollar}{" "}
              {monthStats.tradesMissingDollar === 1 ? "trade" : "trades"} missing $
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   CLEAN HUMAN-DESIGNED EDGE SCORE CARD
   ============================================================ */
function RedesignedEdgeScoreCard({
  score,
  grade,
  gradeColor,
  stats,
  bestSetup,
  worstSetup,
  dollarProfit,
  hasDollarData,
}: {
  score: number;
  grade: string;
  gradeColor: string;
  stats: ReturnType<typeof calcStats>;
  bestSetup: string;
  worstSetup: string;
  dollarProfit: number;
  hasDollarData: boolean;
}) {
  return (
    <Card className="relative flex min-w-0 flex-col justify-between overflow-hidden border-[#1E1E38] bg-[#111124] p-6 shadow-lg">
      <div>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-3">
          <span className="truncate text-xs font-bold uppercase tracking-wider text-[#A0A0C0]">
            Performance Quality Rating
          </span>
          <span
            className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold"
            style={{
              color: gradeColor,
              borderColor: `${gradeColor}40`,
              backgroundColor: `${gradeColor}15`,
            }}
          >
            Grade {grade}
          </span>
        </div>

        <div className="mb-6 flex items-center gap-5">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center">
            <svg className="absolute inset-0" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#1E1E38"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={gradeColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - score / 100)}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: gradeColor }}
            >
              {Math.round(score)}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">
              {edgeVerdict(score)}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#8080A0]">
              Rating computed directly from win rate, profit factor, R
              expectancy, and execution consistency.
            </p>
          </div>
        </div>
      </div>

      {/* Clean Spacious 4-Card Breakdown */}
      <div className="grid grid-cols-2 gap-3 border-t border-[#1E1E38] pt-4">
        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">Best Setup</div>
          <div
            className="mt-1 truncate text-sm font-bold text-[#00D084]"
            title={bestSetup}
          >
            {bestSetup}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">
            Weakest Setup
          </div>
          <div
            className="mt-1 truncate text-sm font-bold text-[#FF4565]"
            title={worstSetup}
          >
            {worstSetup}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">Net P&L</div>
          {hasDollarData ? (
            <div
              className={`mt-1 truncate text-sm font-bold tabular-nums ${
                dollarProfit >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
              }`}
            >
              {dollarProfit >= 0 ? "+" : "-"}$
              {Math.abs(dollarProfit).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          ) : (
            <div className="mt-1 truncate text-sm font-bold text-[#5A5A80]">
              No $ logged
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5">
          <div className="text-xs font-semibold text-[#8080A0]">
            Sample Size
          </div>
          <div className="mt-1 truncate text-sm font-bold tabular-nums text-white">
            {stats.count} closed
          </div>
        </div>
      </div>
    </Card>
  );
}


function DashboardFilters({
  accountNames,
  strategyNames,
  accountFilter,
  strategyFilter,
  timeRange,
  totalTrades,
  filteredTrades,
  onAccountChange,
  onStrategyChange,
  onTimeRangeChange,
  onClear,
}: {
  accountNames: string[];
  strategyNames: string[];
  accountFilter: string;
  strategyFilter: string;
  timeRange: TimeRange;
  totalTrades: number;
  filteredTrades: number;
  onAccountChange: (v: string) => void;
  onStrategyChange: (v: string) => void;
  onTimeRangeChange: (v: TimeRange) => void;
  onClear: () => void;
}) {
  const active = accountFilter || strategyFilter || timeRange !== "all";

  return (
    <Card className="border-[#1E1E38] p-4 shadow-md">
      <div className="grid min-w-0 gap-3 md:grid-cols-3">
        <FilterSelect
          label="Account"
          value={accountFilter}
          onChange={onAccountChange}
          options={accountNames}
          allLabel="All Accounts"
        />

        <FilterSelect
          label="Strategy"
          value={strategyFilter}
          onChange={onStrategyChange}
          options={strategyNames}
          allLabel="All Strategies"
        />

        <div className="min-w-0">
          <label className="text-xs font-semibold text-[#8080A0]">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="mt-1.5 w-full cursor-pointer appearance-none truncate rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors focus:border-[#F0B429]"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[#1E1E38]/60 pt-3 text-xs text-[#8080A0]">
        <span className="min-w-0 truncate">
          Showing <strong className="text-white">{filteredTrades}</strong> of{" "}
          {totalTrades} trades
        </span>

        {active && (
          <button
            onClick={onClear}
            className="shrink-0 whitespace-nowrap font-bold text-[#F0B429] hover:underline"
          >
            Clear filters ×
          </button>
        )}
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-xs font-semibold text-[#8080A0]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full cursor-pointer appearance-none truncate rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors focus:border-[#F0B429]"
      >
        <option value="">{allLabel}</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RiskDesk({
  maxDD,
  streak,
  openTrades,
  expectancy,
  profitFactor,
}: {
  maxDD: number;
  streak: number;
  openTrades: number;
  expectancy: number;
  profitFactor: number;
}) {
  const riskLevel =
    maxDD >= 6 || expectancy < 0 || profitFactor < 1
      ? "High"
      : maxDD >= 3
      ? "Moderate"
      : "Controlled";

  const color =
    riskLevel === "High"
      ? "#FF4565"
      : riskLevel === "Moderate"
      ? "#F0B429"
      : "#00D084";

  return (
    <Card className="flex min-w-0 flex-col justify-between border-[#1E1E38] p-6 shadow-lg">
      <div>
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1E1E38] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <Shield size={18} className="shrink-0 text-[#F0B429]" />
              <span className="truncate">Risk Desk</span>
            </div>
            <div className="mt-1 text-xs text-[#8080A0]">
              Account drawdown monitor
            </div>
          </div>

          <div
            className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold shadow-inner"
            style={{
              color,
              borderColor: `${color}40`,
              background: `${color}18`,
            }}
          >
            {riskLevel}
          </div>
        </div>

        <div className="space-y-3.5">
          <RiskRow
            label="Max Trailing Drawdown"
            value={`-${maxDD.toFixed(2)}R`}
            color="#FF4565"
          />
          <RiskRow
            label="Current Win/Loss Streak"
            value={
              streak > 0
                ? `+${streak}W`
                : streak < 0
                ? `${Math.abs(streak)}L`
                : "—"
            }
            color={streak >= 0 ? "#00D084" : "#FF4565"}
          />
          <RiskRow
            label="Active Open Positions"
            value={`${openTrades}`}
            color="#4C82FB"
          />
          <RiskRow
            label="Expectancy per Trade"
            value={formatR(expectancy)}
            color={expectancy >= 0 ? "#00D084" : "#FF4565"}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F0B429]" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">Risk Note</div>
            <div className="mt-1 text-xs leading-5 text-[#A0A0C0]">
              {riskMessage(riskLevel)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DirectionAllocation({
  longR,
  shortR,
  longCount,
  shortCount,
  longWR,
  shortWR,
}: {
  longR: number;
  shortR: number;
  longCount: number;
  shortCount: number;
  longWR: number;
  shortWR: number;
}) {
  const total = Math.abs(longR) + Math.abs(shortR) || 1;
  const longPct = Math.max(8, (Math.abs(longR) / total) * 100);
  const shortPct = Math.max(8, (Math.abs(shortR) / total) * 100);

  return (
    <Card className="min-w-0 border-[#1E1E38] p-6">
      <div className="mb-5 flex items-center gap-2 border-b border-[#1E1E38] pb-3 text-base font-bold text-white">
        <Flame size={18} className="shrink-0 text-[#F0B429]" />
        <span className="truncate">Direction Breakdown</span>
      </div>

      <div className="space-y-5">
        <DirectionBar
          label="LONG"
          value={longR}
          count={longCount}
          winRate={longWR}
          width={longPct}
          color="#00D084"
        />
        <DirectionBar
          label="SHORT"
          value={shortR}
          count={shortCount}
          winRate={shortWR}
          width={shortPct}
          color="#FF4565"
        />
      </div>
    </Card>
  );
}

function SetupIntelligence({
  best,
  worst,
}: {
  best?: SetupPerformance;
  worst?: SetupPerformance;
}) {
  return (
    <Card className="min-w-0 border-[#1E1E38] p-6">
      <div className="mb-5 flex items-center gap-2 border-b border-[#1E1E38] pb-3 text-base font-bold text-white">
        <Brain size={18} className="shrink-0 text-[#F0B429]" />
        <span className="truncate">Edge Allocation</span>
      </div>

      <div className="space-y-3.5">
        <InsightBlock
          icon={<ArrowUpRight size={18} />}
          label="Size focus"
          title={best?.name || "No setup yet"}
          text={
            best
              ? `${best.totalR >= 0 ? "+" : ""}${best.totalR.toFixed(
                  2
                )}R across ${best.count} ${
                  best.count === 1 ? "trade" : "trades"
                }. This is your most profitable setup.`
              : "Log setups to see where your edge is concentrated."
          }
          tone="green"
        />

        <InsightBlock
          icon={<ArrowDownRight size={18} />}
          label="Review required"
          title={worst?.name || "No leak yet"}
          text={
            worst
              ? `${worst.totalR >= 0 ? "+" : ""}${worst.totalR.toFixed(
                  2
                )}R across ${worst.count} ${
                  worst.count === 1 ? "trade" : "trades"
                }. Check execution criteria before sizing up.`
              : "No underperforming setup detected yet."
          }
          tone="red"
        />
      </div>
    </Card>
  );
}

function NextActionCard({
  stats,
  bestSetup,
  worstSetup,
  openTrades,
}: {
  stats: ReturnType<typeof calcStats>;
  bestSetup?: SetupPerformance;
  worstSetup?: SetupPerformance;
  openTrades: number;
}) {
  const action = getNextAction(stats, bestSetup, worstSetup, openTrades);

  return (
    <Card className="min-w-0 border-[#1E1E38] p-6">
      <div className="mb-5 flex items-center gap-2 border-b border-[#1E1E38] pb-3 text-base font-bold text-white">
        <Target size={18} className="shrink-0 text-[#F0B429]" />
        <span className="truncate">Next Step Guidance</span>
      </div>

      <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
        <div className="text-xs font-semibold uppercase text-[#F0B429]">
          Recommendation
        </div>
        <div className="mt-1.5 break-words text-base font-bold text-white">
          {action.title}
        </div>
        <p className="mt-2 text-xs leading-5 text-[#A0A0C0] sm:text-sm">
          {action.text}
        </p>
      </div>
    </Card>
  );
}

function SetupRow({ row }: { row: SetupPerformance }) {
  const positive = row.totalR >= 0;

  return (
    <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white" title={row.name}>
            {row.name}
          </div>
          <div className="mt-1 truncate text-xs text-[#8080A0]">
            {row.count} {row.count === 1 ? "trade" : "trades"} ·{" "}
            {formatPct(row.winRate)} WR
          </div>
        </div>

        <div
          className={[
            "shrink-0 whitespace-nowrap text-sm font-bold tabular-nums",
            positive ? "text-[#00D084]" : "text-[#FF4565]",
          ].join(" ")}
        >
          {formatR(row.totalR)}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className={positive ? "h-full bg-[#00D084]" : "h-full bg-[#FF4565]"}
          style={{
            width: `${Math.min(100, Math.max(8, Math.abs(row.totalR) * 12))}%`,
          }}
        />
      </div>
    </div>
  );
}

function RecentTradeRow({ trade }: { trade: Trade }) {
  const isOpen = !hasResult(trade);
  const result = Number(trade.result || 0);
  const positive = result >= 0;

  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3.5 transition-colors hover:border-white/20">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div
            className={[
              "shrink-0 rounded px-2 py-0.5 text-[10px] font-bold",
              trade.direction === "LONG"
                ? "bg-[#00D084]/15 text-[#00D084]"
                : "bg-[#FF4565]/15 text-[#FF4565]",
            ].join(" ")}
          >
            {trade.direction}
          </div>
          <div
            className="truncate text-sm font-bold text-white"
            title={trade.instrument}
          >
            {trade.instrument}
          </div>
        </div>

        <div className="mt-1 truncate text-xs text-[#8080A0]">
          {trade.date} · {trade.setup || "No strategy"} ·{" "}
          {trade.account || "No account"}
        </div>
      </div>

      <div
        className={[
          "shrink-0 whitespace-nowrap text-sm font-bold tabular-nums",
          isOpen
            ? "text-[#4C82FB]"
            : positive
            ? "text-[#00D084]"
            : "text-[#FF4565]",
        ].join(" ")}
      >
        {isOpen ? "OPEN" : formatR(result)}
      </div>
    </div>
  );
}

function RiskRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3">
      <span className="min-w-0 truncate text-xs font-semibold text-[#A0A0C0]">
        {label}
      </span>
      <span
        className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function DirectionBar({
  label,
  value,
  count,
  winRate,
  width,
  color,
}: {
  label: string;
  value: number;
  count: number;
  winRate: number;
  width: number;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-white">{label}</div>
        <div
          className="shrink-0 whitespace-nowrap text-xs font-bold tabular-nums"
          style={{ color }}
        >
          {formatR(value)}
        </div>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, background: color }}
        />
      </div>

      <div className="mt-1.5 truncate text-xs text-[#8080A0]">
        {count} {count === 1 ? "trade" : "trades"} ·{" "}
        {count ? formatPct(winRate) : "—"} WR
      </div>
    </div>
  );
}

function InsightBlock({
  icon,
  label,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  text: string;
  tone: "green" | "red";
}) {
  const color = tone === "green" ? "#00D084" : "#FF4565";

  return (
    <div className="min-w-0 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0" style={{ color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8080A0]">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-white" title={title}>
            {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-[#A0A0C0]">{text}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyMini({ message }: { message: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-[#1E1E38] bg-[#0D0D1A] p-6 text-center text-sm text-[#8080A0]">
      {message}
    </div>
  );
}

type SetupPerformance = {
  name: string;
  count: number;
  wins: number;
  totalR: number;
  winRate: number;
};

function getSetupPerformance(trades: Trade[]): SetupPerformance[] {
  const map = new Map<string, SetupPerformance>();

  for (const trade of trades) {
    if (!trade.setup || !hasResult(trade)) continue;

    const existing =
      map.get(trade.setup) ||
      ({
        name: trade.setup,
        count: 0,
        wins: 0,
        totalR: 0,
        winRate: 0,
      } satisfies SetupPerformance);

    existing.count += 1;
    existing.totalR += Number(trade.result || 0);
    if (Number(trade.result || 0) > 0) existing.wins += 1;
    existing.winRate = existing.count ? existing.wins / existing.count : 0;

    map.set(trade.setup, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalR - a.totalR);
}

function hasResult(trade: Trade) {
  return (
    trade.result !== "" &&
    trade.result !== null &&
    trade.result !== undefined &&
    Number.isFinite(Number(trade.result))
  );
}

function withinTimeRange(trade: Trade, range: TimeRange) {
  if (range === "all") return true;
  if (!trade.date) return false;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return new Date(`${trade.date}T12:00:00`) >= cutoff;
}

function calculateEdgeScore(
  count: number,
  winRate: number,
  expectancy: number,
  profitFactor: number
) {
  let score = 0;

  score += Math.min(35, Math.max(0, ((profitFactor - 0.7) / 1.8) * 35));
  score += Math.min(30, Math.max(0, ((expectancy + 0.25) / 1.25) * 30));
  score += Math.min(20, Math.max(0, (winRate / 0.55) * 20));
  score += Math.min(15, Math.max(0, (count / 100) * 15));

  return Math.max(0, Math.min(100, score));
}

function getGrade(score: number) {
  if (score >= 88) return "S";
  if (score >= 75) return "A";
  if (score >= 62) return "B";
  if (score >= 48) return "C";
  if (score >= 32) return "D";
  return "E";
}

function getGradeColor(score: number) {
  if (score >= 75) return "#00D084";
  if (score >= 48) return "#F0B429";
  return "#FF4565";
}

function edgeVerdict(score: number) {
  if (score >= 88) return "Strong consistency detected.";
  if (score >= 75) return "Positive edge forming.";
  if (score >= 62) return "Profitable execution.";
  if (score >= 48) return "Break-even zone.";
  if (score >= 32) return "Inconsistent performance.";
  return "Review rules required.";
}

function riskMessage(level: string) {
  if (level === "High") {
    return "Consider reducing position size by 50% until drawdown stabilizes.";
  }

  if (level === "Moderate") {
    return "Drawdown is within normal limits. Stick strictly to your daily loss cap.";
  }

  return "Risk metrics are healthy. Focus on executing your highest expectancy setups.";
}

function getNextAction(
  stats: ReturnType<typeof calcStats>,
  best?: SetupPerformance,
  worst?: SetupPerformance,
  openTrades?: number
) {
  if (!stats.count) {
    return {
      title: "Log 10 completed trades.",
      text: "Record date, setup, instrument, and profit/loss to generate your statistical performance profile.",
    };
  }

  if (openTrades && openTrades >= 3) {
    return {
      title: "Manage open exposure.",
      text: "You have multiple active positions. Ensure stops are set before entering new setups.",
    };
  }

  if (stats.expectancy < 0) {
    return {
      title: "Pause your weakest strategy.",
      text: worst
        ? `${worst.name} has negative expectancy. Review execution criteria before sizing this strategy.`
        : "Expectancy is negative. Review entry criteria before increasing position size.",
    };
  }

  if (stats.profitFactor < 1.2) {
    return {
      title: "Be more selective.",
      text: "Profit factor is thin. Focus exclusively on high-probability setups for your next sequence of trades.",
    };
  }

  return {
    title: best ? `Stick to ${best.name}.` : "Maintain your execution process.",
    text: best
      ? `${best.name} is currently your most profitable setup. Continue trading it with consistent sizing.`
      : "Your metrics show steady consistency. Maintain disciplined risk management.",
  };
}
