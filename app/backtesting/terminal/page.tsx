"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CandlestickChart,
  Clock,
  Crosshair,
  Download,
  Eraser,
  FastForward,
  Layers,
  LineChart,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Save,
  SkipForward,
  Square,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/providers/ProtectedRoute";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  calculateBacktestStats,
  calculateQuantity,
  closeTrade,
  maybeAutoCloseTrade,
  parseCandlesCsv,
} from "@/lib/backtesting/engine";
import { runStrategy } from "@/lib/backtesting/strategy";
import {
  TIMEFRAMES,
  type BacktestSide,
  type BacktestTrade,
  type Candle,
  type Drawing,
  type DrawingType,
  type IndicatorConfig,
  type OpenBacktestTrade,
  type StrategyConfig,
  type StrategyResult,
} from "@/lib/backtesting/types";

const TerminalChart = dynamic(() => import("@/components/backtesting/TerminalChart").then((m) => m.TerminalChart), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading terminal chart…</div>,
});

type DataSource = "market" | "csv";
type BottomTab = "order" | "trades" | "stats" | "journal" | "sessions" | "data" | "strategy";

// Forex + crypto + metals instruments. The /api/chart/candles route resolves
// each symbol to the right provider (Binance for *USDT, Yahoo for FX/metals).
const MARKETS: Array<{ symbol: string; label: string; group: string }> = [
  { symbol: "BTCUSDT", label: "BTC/USDT", group: "Crypto" },
  { symbol: "ETHUSDT", label: "ETH/USDT", group: "Crypto" },
  { symbol: "SOLUSDT", label: "SOL/USDT", group: "Crypto" },
  { symbol: "BNBUSDT", label: "BNB/USDT", group: "Crypto" },
  { symbol: "XRPUSDT", label: "XRP/USDT", group: "Crypto" },
  { symbol: "ADAUSDT", label: "ADA/USDT", group: "Crypto" },
  { symbol: "DOGEUSDT", label: "DOGE/USDT", group: "Crypto" },
  { symbol: "AVAXUSDT", label: "AVAX/USDT", group: "Crypto" },
  { symbol: "EURUSD", label: "EUR/USD", group: "Forex" },
  { symbol: "GBPUSD", label: "GBP/USD", group: "Forex" },
  { symbol: "USDJPY", label: "USD/JPY", group: "Forex" },
  { symbol: "AUDUSD", label: "AUD/USD", group: "Forex" },
  { symbol: "USDCAD", label: "USD/CAD", group: "Forex" },
  { symbol: "XAUUSD", label: "Gold XAU/USD", group: "Metals" },
  { symbol: "XAGUSD", label: "Silver XAG/USD", group: "Metals" },
];

type SavedSession = {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  starting_balance: number;
  current_balance: number | null;
  created_at: string;
  backtest_trades?: Array<{ count: number }>;
};

const sampleCsv = `time,open,high,low,close,volume
2026-07-01T09:00:00Z,100,102,99,101,1000
2026-07-01T09:05:00Z,101,104,100,103,1200
2026-07-01T09:10:00Z,103,103.5,99.5,100,1300
2026-07-01T09:15:00Z,100,105,99,104,1400
2026-07-01T09:20:00Z,104,108,103,107,1600
2026-07-01T09:25:00Z,107,109,104,105,1700
2026-07-01T09:30:00Z,105,111,104,110,2200`;

const drawTools: Array<{ id: string; label: string; icon: typeof Crosshair; tool: DrawingType | null }> = [
  { id: "crosshair", label: "Cursor", icon: Crosshair, tool: null },
  { id: "trendline", label: "Trendline", icon: LineChart, tool: "trendline" },
  { id: "level", label: "Horizontal level", icon: Layers, tool: "level" },
  { id: "rectangle", label: "Rectangle", icon: Square, tool: "rectangle" },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function signedMoney(value: number) {
  const formatted = money(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function TerminalMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "green" | "red" | "gold" | "neutral" }) {
  return (
    <div className="rounded-xl border border-[#1E1E38] bg-[#0B0B14] px-3 py-2">
      <p className="font-mono2 text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={classNames(
        "mt-1 font-mono2 text-sm font-black",
        tone === "green" && "text-[#00D084]",
        tone === "red" && "text-[#FF4565]",
        tone === "gold" && "text-[#F0B429]",
        tone === "neutral" && "text-white"
      )}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

const terminalInput = "w-full rounded-lg border border-[#1E1E38] bg-[#08080F] px-3 py-2 text-xs text-white outline-none focus:border-[#F0B429]";
const TIMEZONES = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Brisbane"];

export default function BacktestingTerminalPage() {
  const { user } = useAuth();
  const [dataSource, setDataSource] = useState<DataSource>("market");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("5m");
  const [from, setFrom] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");
  const [timezone, setTimezone] = useState("UTC");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [csv, setCsv] = useState(sampleCsv);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [dataWarning, setDataWarning] = useState("");

  const [sessionName, setSessionName] = useState("BTCUSDT Terminal Backtest");
  const [startingBalance, setStartingBalance] = useState("100000");
  const [balance, setBalance] = useState(100000);
  const [riskPercent, setRiskPercent] = useState("1");
  const [manualQuantity, setManualQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [setup, setSetup] = useState("Terminal setup");
  const [notes, setNotes] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(650);
  const [openTrade, setOpenTrade] = useState<OpenBacktestTrade | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [bottomTab, setBottomTab] = useState<BottomTab>("order");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingType | null>(null);
  const [indicators, setIndicators] = useState<IndicatorConfig>({ sma: { enabled: true, period: 20 }, ema: { enabled: false, period: 50 }, rsi: { enabled: false, period: 14 }, volume: true });
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>({ type: "ma_cross", fastPeriod: 20, slowPeriod: 50, stopLossPercent: 2, takeProfitPercent: 4, initialCapital: Number(startingBalance) || 100000, symbol });
  const [strategySummary, setStrategySummary] = useState("");
  const [strategyResult, setStrategyResult] = useState<StrategyResult | null>(null);

  const numericStartingBalance = Number(startingBalance) || 0;
  const currentCandle = candles[currentIndex] || null;
  const previousCandle = candles[Math.max(0, currentIndex - 1)] || null;
  const visibleCandles = useMemo(() => candles.slice(0, Math.max(1, currentIndex + 1)), [candles, currentIndex]);
  const stats = useMemo(() => calculateBacktestStats(trades, numericStartingBalance || 1), [trades, numericStartingBalance]);
  const progress = candles.length ? ((currentIndex + 1) / candles.length) * 100 : 0;
  const unrealizedPnl = openTrade && currentCandle ? (openTrade.side === "long" ? currentCandle.close - openTrade.entryPrice : openTrade.entryPrice - currentCandle.close) * openTrade.quantity : 0;
  const currentPriceChange = currentCandle && previousCandle ? currentCandle.close - previousCandle.close : 0;

  const loadSavedSessions = useCallback(async () => {
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/backtests/sessions", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (res.ok) setSavedSessions(json.sessions || []);
    } catch {
      // ignore non-critical session list errors
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSavedSessions();
  }, [loadSavedSessions]);

  const addDrawing = useCallback((d: Drawing) => setDrawings((rows) => [...rows, d]), []);
  const clearDrawings = useCallback(() => setDrawings([]), []);

  const loadCandles = useCallback(async () => {
    setLoadingData(true);
    setDataError("");
    setDataWarning("");
    setPlaying(false);
    setOpenTrade(null);
    setTrades([]);
    setBalance(Number(startingBalance) || 100000);
    setCurrentIndex(0);

    try {
      if (dataSource === "csv") {
        const parsed = parseCandlesCsv(csv);
        if (parsed.length < 5) throw new Error("CSV needs at least 5 valid candles with time, open, high, low, close columns.");
        setCandles(parsed.slice(0, 5000));
        setDataWarning("Custom CSV loaded. Use this mode for forex, futures, indices, or any provider export.");
        return;
      }

      const fromMs = liveMode ? Date.now() - 180 * 24 * 60 * 60 * 1000 : new Date(`${from}T${fromTime || "00:00"}:00`).getTime();
      const toMs = liveMode ? Date.now() : new Date(`${to}T${toTime || "23:59"}:00`).getTime();
      const params = new URLSearchParams({ symbol, timeframe, from: String(fromMs), to: String(toMs) });
      const res = await fetch(`/api/chart/candles?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load market data.");
      if (!json.candles?.length) throw new Error("No candles returned for that range.");
      setCandles(json.candles);
      setDataWarning(json.warning || "");
      setSessionName(`${symbol} ${timeframe} Terminal Backtest`);
    } catch (error) {
      setCandles([]);
      setDataError(error instanceof Error ? error.message : "Could not load candles.");
    } finally {
      setLoadingData(false);
    }
  }, [csv, dataSource, from, fromTime, liveMode, startingBalance, symbol, timeframe, to, toTime]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCandles();
  }, [loadCandles]);

  const advanceOne = useCallback(() => {
    setCurrentIndex((index) => {
      const nextIndex = Math.min(index + 1, candles.length - 1);
      if (nextIndex === index) {
        setPlaying(false);
        return index;
      }

      const nextCandle = candles[nextIndex];
      if (openTrade && nextCandle) {
        const closed = maybeAutoCloseTrade(openTrade, nextCandle, balance);
        if (closed) {
          setTrades((rows) => [...rows, closed]);
          setBalance(closed.balanceAfter);
          setOpenTrade(null);
        }
      }
      return nextIndex;
    });
  }, [balance, candles, openTrade]);

  const stepBack = useCallback(() => {
    if (openTrade) return;
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, [openTrade]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(advanceOne, speedMs);
    return () => clearInterval(timer);
  }, [advanceOne, playing, speedMs]);

  function resetSession() {
    setPlaying(false);
    setCurrentIndex(0);
    setOpenTrade(null);
    setTrades([]);
    setBalance(Number(startingBalance) || 100000);
    setSaveMessage("");
  }

  function runStrategyBacktest() {
    if (candles.length < Math.max(strategyConfig.fastPeriod, strategyConfig.slowPeriod) + 2) {
      setStrategySummary("Load enough candles (more bars than the slow MA period) before running the strategy tester.");
      setStrategyResult(null);
      setBottomTab("strategy");
      return;
    }
    const result = runStrategy(candles, { ...strategyConfig, symbol, initialCapital: numericStartingBalance || 100000 });
    setStrategyResult(result);
    const s = result.stats;
    setStrategySummary(
      `${strategyConfig.type.toUpperCase()} ${strategyConfig.fastPeriod}/${strategyConfig.slowPeriod} · ${s.trades} trades · WR ${(s.winRate * 100).toFixed(1)}% · Net ${signedMoney(s.netPnl)} (${(s.returnPercent * 100).toFixed(2)}%) · PF ${s.profitFactor >= 99 ? "∞" : s.profitFactor.toFixed(2)} · Max DD ${money(s.maxDrawdown)}`
    );
    setBottomTab("strategy");
  }

  function defaultStop(side: BacktestSide, entry: number) {
    return side === "long" ? entry * 0.99 : entry * 1.01;
  }

  function defaultTarget(side: BacktestSide, entry: number) {
    return side === "long" ? entry * 1.02 : entry * 0.98;
  }

  function openPosition(side: BacktestSide) {
    if (!currentCandle || openTrade) return;
    const entry = currentCandle.close;
    const sl = Number(stopLoss) || defaultStop(side, entry);
    const tp = Number(takeProfit) || defaultTarget(side, entry);
    const risk = calculateQuantity({ balance, riskPercent: Number(riskPercent) || 1, entryPrice: entry, stopLoss: sl });
    const quantity = Number(manualQuantity) > 0 ? Number(manualQuantity) : risk.quantity;
    const riskAmount = Math.abs(entry - sl) * quantity;

    if (!quantity || !Number.isFinite(quantity) || riskAmount <= 0) {
      setSaveMessage("Set a valid stop-loss or quantity before opening a trade.");
      return;
    }

    setOpenTrade({
      id: crypto.randomUUID(),
      side,
      symbol,
      entryTime: currentCandle.time,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: Number.isFinite(tp) ? tp : null,
      quantity,
      riskAmount,
      setup,
      notes,
    });
  }

  function closeOpenTrade(reason: BacktestTrade["exitReason"] = "manual") {
    if (!openTrade || !currentCandle) return;
    const closed = closeTrade(openTrade, currentCandle.time, currentCandle.close, balance, reason);
    setTrades((rows) => [...rows, closed]);
    setBalance(closed.balanceAfter);
    setOpenTrade(null);
  }

  function moveStopToBreakEven() {
    if (!openTrade) return;
    setOpenTrade({ ...openTrade, stopLoss: openTrade.entryPrice });
  }

  async function saveBacktest() {
    if (!user) return;
    if (!trades.length) {
      setSaveMessage("Close at least one trade before saving the session.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/backtests/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          name: sessionName,
          symbol,
          market: dataSource === "csv" ? "Custom CSV" : (MARKETS.find((m) => m.symbol === symbol)?.group ?? "Crypto"),
          timeframe,
          startDate: from,
          endDate: to,
          startingBalance: numericStartingBalance,
          currentBalance: balance,
          notes,
          trades,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save backtest.");
      setSaveMessage("Backtest saved successfully.");
      await loadSavedSessions();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not save backtest.");
    } finally {
      setSaving(false);
    }
  }

  function downloadTradesCsv() {
    const headers = ["side", "symbol", "entryTime", "exitTime", "entryPrice", "exitPrice", "stopLoss", "takeProfit", "quantity", "riskAmount", "pnl", "rMultiple", "balanceAfter", "exitReason", "setup", "notes"];
    const rows = trades.map((trade) => [
      trade.side,
      trade.symbol,
      new Date(trade.entryTime * 1000).toISOString(),
      new Date(trade.exitTime * 1000).toISOString(),
      trade.entryPrice,
      trade.exitPrice,
      trade.stopLoss,
      trade.takeProfit ?? "",
      trade.quantity,
      trade.riskAmount,
      trade.pnl,
      trade.rMultiple,
      trade.balanceAfter,
      trade.exitReason,
      trade.setup || "",
      trade.notes || "",
    ]);
    const csvText = [headers.join(","), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`;
    const a = document.createElement("a");
    a.href = href;
    a.download = `${symbol}-${timeframe}-terminal-backtest.csv`;
    a.click();
  }

  const currentTime = currentCandle ? new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(currentCandle.time * 1000)) : "—";

  return (
    <ProtectedRoute>
      <div className="flex h-[100svh] flex-col overflow-hidden bg-[#05050B] text-white">
        {/* ProfitPnL View top command bar */}
        <div className="border-b border-[#1E1E38] bg-[#f7f7f8] px-3 py-2 text-[#101018]">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <Link href="/dashboard" className="mr-1 rounded-md bg-black px-2 py-1 text-xs font-black text-white">P</Link>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <CandlestickChart size={16} className="text-[#c8961e]" />
              {dataSource === "market" ? (
                <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="bg-transparent text-sm font-bold outline-none">
                  {MARKETS.map((m) => <option key={m.symbol} value={m.symbol}>{m.label}</option>)}
                </select>
              ) : (
                <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} className="w-24 bg-transparent text-sm font-bold outline-none" />
              )}
            </div>
            <div className="flex items-center rounded-lg bg-white p-1 shadow-sm">
              {TIMEFRAMES.map((item) => (
                <button key={item} onClick={() => setTimeframe(item)} className={classNames("rounded-md px-2.5 py-1 text-xs font-bold", timeframe === item ? "bg-[#101018] text-white" : "text-zinc-500 hover:text-black")}>{item}</button>
              ))}
            </div>
            <button onClick={() => { setLiveMode(true); loadCandles(); }} className={classNames("rounded-lg px-3 py-1.5 text-xs font-black shadow-sm", liveMode ? "bg-[#2962ff] text-white" : "bg-white text-zinc-700")}>LIVE</button>
            <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#101018] px-3 py-1.5 text-xs font-black text-white shadow-sm"><Calendar size={14} /> Backtest</button>
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm outline-none">
              {TIMEZONES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={loadCandles} disabled={loadingData} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm disabled:opacity-50">
              {loadingData ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reload
            </button>
            <button onClick={saveBacktest} disabled={saving || !trades.length} className="inline-flex items-center gap-2 rounded-lg bg-[#f0b429] px-3 py-1.5 text-xs font-black text-black shadow-sm disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
            <button onClick={downloadTradesCsv} disabled={!trades.length} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm disabled:opacity-50"><Download size={14} /> Export</button>
            <div className="ml-auto flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm">
              <Clock size={14} /> {currentTime} · {timezone}
            </div>
          </div>
          {(dataWarning || dataError || saveMessage) && (
            <div className="mt-2 text-xs">
              {dataWarning && <span className="mr-4 text-[#9a6a00]">{dataWarning}</span>}
              {dataError && <span className="mr-4 text-[#cc1f3b]">{dataError}</span>}
              {saveMessage && <span className="text-zinc-600">{saveMessage}</span>}
            </div>
          )}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[52px_minmax(0,1fr)] xl:grid-cols-[52px_minmax(0,1fr)_360px]">
          {/* Left toolbar */}
          <aside className="border-r border-[#1E1E38] bg-[#08080F] p-2">
            <div className="space-y-2">
              {drawTools.map((tool) => {
                const Icon = tool.icon;
                const active = activeTool === tool.tool;
                return (
                  <button
                    key={tool.id}
                    title={tool.label}
                    onClick={() => setActiveTool(tool.tool)}
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                      active ? "border-[#F0B429] bg-[#F0B429]/10 text-[#F0B429]" : "border-[#1E1E38] text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
              <button
                title="Clear drawings"
                onClick={clearDrawings}
                disabled={!drawings.length}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E1E38] text-zinc-500 transition-colors hover:text-[#FF4565] disabled:opacity-30"
              >
                <Eraser size={17} />
              </button>
            </div>
          </aside>

          {/* Center chart + replay */}
          <section className="flex min-w-0 flex-col border-r border-[#1E1E38] bg-[#05050B]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E1E38] bg-[#08080F] px-4 py-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-mono2 text-[#F0B429]">{symbol}</span>
                <span className={currentPriceChange >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>
                  {currentCandle ? currentCandle.close.toFixed(2) : "—"} {currentPriceChange >= 0 ? "+" : ""}{currentPriceChange.toFixed(2)}
                </span>
                <span className="text-zinc-500">{currentTime}</span>
                <span className="text-zinc-600">Tool: {activeTool ?? "Cursor"}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>{candles.length ? `${currentIndex + 1}/${candles.length}` : "0/0"}</span>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#1E1E38]"><div className="h-full bg-[#F0B429]" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>

            <div className="relative min-h-[280px] flex-1 sm:min-h-[420px] xl:min-h-[520px]">
              <TerminalChart
                candles={visibleCandles}
                openTrade={openTrade}
                trades={trades}
                indicators={indicators}
                drawings={drawings}
                activeTool={activeTool}
                onAddDrawing={addDrawing}
                onClearDrawings={clearDrawings}
              />
              {openTrade && currentCandle && (
                <div className="absolute left-4 top-4 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A]/90 p-4 shadow-2xl backdrop-blur">
                  <p className="font-mono2 text-[10px] uppercase tracking-widest text-zinc-500">Open position</p>
                  <p className={classNames("mt-1 font-black", openTrade.side === "long" ? "text-[#00D084]" : "text-[#FF4565]")}>{openTrade.side.toUpperCase()} {symbol}</p>
                  <p className="mt-1 text-xs text-zinc-400">Entry {openTrade.entryPrice.toFixed(2)} · SL {openTrade.stopLoss.toFixed(2)} · TP {openTrade.takeProfit?.toFixed(2) || "—"}</p>
                  <p className={classNames("mt-2 font-mono2 text-lg font-black", unrealizedPnl >= 0 ? "text-[#00D084]" : "text-[#FF4565]")}>{signedMoney(unrealizedPnl)}</p>
                </div>
              )}
            </div>

            <div className="border-t border-[#1E1E38] bg-[#08080F] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={stepBack} disabled={!candles.length || !!openTrade} className="rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-zinc-300 disabled:opacity-40">◀</button>
                <button onClick={() => setPlaying((value) => !value)} disabled={!candles.length} className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-black disabled:opacity-50">
                  {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Pause" : "Play"}
                </button>
                <button onClick={advanceOne} disabled={!candles.length} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-[#F0B429]"><SkipForward size={14} /> Step</button>
                <button onClick={() => { for (let i = 0; i < 10; i++) setTimeout(advanceOne, i * 25); }} disabled={!candles.length} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-[#F0B429]"><FastForward size={14} /> +10</button>
                <button onClick={resetSession} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-[#F0B429]"><Square size={14} /> Reset</button>
                <select value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))} className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-xs text-white outline-none">
                  <option value={1000}>1x</option>
                  <option value={650}>2x</option>
                  <option value={300}>5x</option>
                  <option value={120}>10x</option>
                </select>
                <span className="ml-auto text-xs text-zinc-600">Future candles hidden · replay locked</span>
              </div>
            </div>
          </section>

          {/* Right terminal panel */}
          <aside className="hidden min-w-0 flex-col bg-[#08080F] xl:flex">
            <div className="border-b border-[#1E1E38] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Wallet size={17} className="text-[#F0B429]" /> Demo account</div>
              <div className="grid grid-cols-2 gap-2">
                <TerminalMetric label="Balance" value={money(balance)} tone={balance >= numericStartingBalance ? "green" : "red"} />
                <TerminalMetric label="Net P&L" value={signedMoney(stats.netPnl)} tone={stats.netPnl >= 0 ? "green" : "red"} />
                <TerminalMetric label="Return" value={pct(stats.returnPercent)} tone={stats.returnPercent >= 0 ? "green" : "red"} />
                <TerminalMetric label="Win Rate" value={`${(stats.winRate * 100).toFixed(1)}%`} tone="gold" />
              </div>
            </div>

            <div className="border-b border-[#1E1E38] p-4">
              <div className="mb-3 text-sm font-black text-white">Order ticket</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Capital"><input value={startingBalance} onChange={(event) => { setStartingBalance(event.target.value); setBalance(Number(event.target.value) || 0); }} className={terminalInput} /></Field>
                <Field label="Risk %"><input value={riskPercent} onChange={(event) => setRiskPercent(event.target.value)} className={terminalInput} /></Field>
                <Field label="Stop"><input value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} placeholder={currentCandle ? (currentCandle.close * 0.99).toFixed(2) : ""} className={terminalInput} /></Field>
                <Field label="Target"><input value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} placeholder={currentCandle ? (currentCandle.close * 1.02).toFixed(2) : ""} className={terminalInput} /></Field>
                <Field label="Quantity"><input value={manualQuantity} onChange={(event) => setManualQuantity(event.target.value)} placeholder="auto" className={terminalInput} /></Field>
                <Field label="Setup"><input value={setup} onChange={(event) => setSetup(event.target.value)} className={terminalInput} /></Field>
              </div>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Journal notes" className="mt-3 h-20 w-full rounded-lg border border-[#1E1E38] bg-[#08080F] p-3 text-xs text-white outline-none focus:border-[#F0B429]" />

              {openTrade ? (
                <div className="mt-4 space-y-2">
                  <button onClick={() => closeOpenTrade("manual")} className="w-full rounded-xl bg-[#F0B429] px-4 py-3 text-sm font-black text-black">Close position</button>
                  <button onClick={moveStopToBreakEven} className="w-full rounded-xl border border-[#1E1E38] px-4 py-3 text-xs font-bold text-zinc-300 hover:text-[#F0B429]">Move SL to breakeven</button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button onClick={() => openPosition("long")} disabled={!currentCandle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D084] px-4 py-3 text-sm font-black text-black disabled:opacity-50"><TrendingUp size={16} /> BUY</button>
                  <button onClick={() => openPosition("short")} disabled={!currentCandle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4565] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><TrendingDown size={16} /> SELL</button>
                </div>
              )}
            </div>

            <div className="border-b border-[#1E1E38] p-4">
              <div className="mb-3 text-sm font-black text-white">Indicators</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2">
                  <button onClick={() => setIndicators((c) => ({ ...c, sma: { ...c.sma, enabled: !c.sma.enabled } }))} className={classNames("inline-flex items-center gap-2 text-xs font-bold", indicators.sma.enabled ? "text-white" : "text-zinc-500")}>
                    <span className="h-2 w-2 rounded-full bg-[#f0b429]" /> SMA
                  </button>
                  {indicators.sma.enabled && (
                    <input type="number" min={1} value={indicators.sma.period} onChange={(e) => setIndicators((c) => ({ ...c, sma: { ...c.sma, period: Math.max(1, Number(e.target.value) || 1) } }))} className="w-16 rounded-md border border-[#1E1E38] bg-[#08080F] px-2 py-1 text-xs text-white outline-none" />
                  )}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2">
                  <button onClick={() => setIndicators((c) => ({ ...c, ema: { ...c.ema, enabled: !c.ema.enabled } }))} className={classNames("inline-flex items-center gap-2 text-xs font-bold", indicators.ema.enabled ? "text-white" : "text-zinc-500")}>
                    <span className="h-2 w-2 rounded-full bg-[#22d3ee]" /> EMA
                  </button>
                  {indicators.ema.enabled && (
                    <input type="number" min={1} value={indicators.ema.period} onChange={(e) => setIndicators((c) => ({ ...c, ema: { ...c.ema, period: Math.max(1, Number(e.target.value) || 1) } }))} className="w-16 rounded-md border border-[#1E1E38] bg-[#08080F] px-2 py-1 text-xs text-white outline-none" />
                  )}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2">
                  <button onClick={() => setIndicators((c) => ({ ...c, rsi: { ...c.rsi, enabled: !c.rsi.enabled } }))} className={classNames("inline-flex items-center gap-2 text-xs font-bold", indicators.rsi.enabled ? "text-white" : "text-zinc-500")}>
                    <span className="h-2 w-2 rounded-full bg-[#a855f7]" /> RSI
                  </button>
                  {indicators.rsi.enabled && (
                    <input type="number" min={1} value={indicators.rsi.period} onChange={(e) => setIndicators((c) => ({ ...c, rsi: { ...c.rsi, period: Math.max(1, Number(e.target.value) || 1) } }))} className="w-16 rounded-md border border-[#1E1E38] bg-[#08080F] px-2 py-1 text-xs text-white outline-none" />
                  )}
                </div>
                <button onClick={() => setIndicators((c) => ({ ...c, volume: !c.volume }))} className={classNames("flex w-full items-center justify-between rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-xs font-bold", indicators.volume ? "text-white" : "text-zinc-500")}>
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#7c8cff]" /> Volume</span>
                  <span>{indicators.volume ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            <div className="border-b border-[#1E1E38] p-4">
              <div className="mb-3 text-sm font-black text-white">Strategy Tester</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={strategyConfig.type} onChange={(e) => setStrategyConfig((c) => ({ ...c, type: e.target.value as StrategyConfig["type"] }))} className={terminalInput}>
                    <option value="ma_cross">MA Cross</option>
                    <option value="mean_reversion">Mean Reversion</option>
                    <option value="breakout">Breakout</option>
                  </select>
                </Field>
                <Field label="Fast"><input type="number" min={1} value={strategyConfig.fastPeriod} onChange={(e) => setStrategyConfig((c) => ({ ...c, fastPeriod: Math.max(1, Number(e.target.value) || 1) }))} className={terminalInput} /></Field>
                <Field label="Slow"><input type="number" min={1} value={strategyConfig.slowPeriod} onChange={(e) => setStrategyConfig((c) => ({ ...c, slowPeriod: Math.max(1, Number(e.target.value) || 1) }))} className={terminalInput} /></Field>
                <Field label="Stop %"><input type="number" min={0} step={0.1} value={strategyConfig.stopLossPercent} onChange={(e) => setStrategyConfig((c) => ({ ...c, stopLossPercent: Math.max(0, Number(e.target.value) || 0) }))} className={terminalInput} /></Field>
                <Field label="Target %"><input type="number" min={0} step={0.1} value={strategyConfig.takeProfitPercent} onChange={(e) => setStrategyConfig((c) => ({ ...c, takeProfitPercent: Math.max(0, Number(e.target.value) || 0) }))} className={terminalInput} /></Field>
              </div>
              <button onClick={runStrategyBacktest} disabled={!candles.length} className="mt-3 w-full rounded-xl bg-[#2962ff] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Run Strategy</button>
              {strategySummary && <p className="mt-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3 text-xs leading-relaxed text-zinc-300">{strategySummary}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 text-sm font-black text-white">Markets</div>
              <div className="space-y-2">
                {MARKETS.map((item) => (
                  <button key={item.symbol} onClick={() => { setDataSource("market"); setSymbol(item.symbol); }} className={classNames("flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs", item.symbol === symbol ? "border-[#F0B429] bg-[#F0B429]/10 text-[#F0B429]" : "border-[#1E1E38] text-zinc-400 hover:text-white")}>
                    <span>{item.label}</span><span className="text-[10px] uppercase tracking-widest text-zinc-600">{item.group}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom terminal */}
        <div className="max-h-[42svh] overflow-hidden border-t border-[#1E1E38] bg-[#08080F] xl:max-h-72">
          <div className="flex overflow-x-auto border-b border-[#1E1E38] px-3">
            {[
              ["order", "Order"],
              ["trades", "Trades"],
              ["stats", "Stats"],
              ["strategy", "Strategy"],
              ["journal", "Journal"],
              ["sessions", "Sessions"],
              ["data", "Data"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setBottomTab(id as BottomTab)} className={classNames("border-b-2 px-4 py-3 text-xs font-bold", bottomTab === id ? "border-[#F0B429] text-[#F0B429]" : "border-transparent text-zinc-500 hover:text-zinc-300")}>{label}</button>
            ))}
          </div>
          <div className="max-h-72 overflow-auto p-4">
            {bottomTab === "order" && (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Capital"><input value={startingBalance} onChange={(event) => { setStartingBalance(event.target.value); setBalance(Number(event.target.value) || 0); }} className={terminalInput} /></Field>
                  <Field label="Risk %"><input value={riskPercent} onChange={(event) => setRiskPercent(event.target.value)} className={terminalInput} /></Field>
                  <Field label="Stop"><input value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} placeholder={currentCandle ? (currentCandle.close * 0.99).toFixed(2) : ""} className={terminalInput} /></Field>
                  <Field label="Target"><input value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} placeholder={currentCandle ? (currentCandle.close * 1.02).toFixed(2) : ""} className={terminalInput} /></Field>
                  <Field label="Quantity"><input value={manualQuantity} onChange={(event) => setManualQuantity(event.target.value)} placeholder="auto" className={terminalInput} /></Field>
                  <Field label="Setup"><input value={setup} onChange={(event) => setSetup(event.target.value)} className={terminalInput} /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {openTrade ? (
                    <>
                      <div className="rounded-xl border border-[#F0B429]/25 bg-[#F0B429]/10 p-3 text-xs text-[#F0B429]">Open {openTrade.side.toUpperCase()} @ {openTrade.entryPrice.toFixed(2)}</div>
                      <button onClick={() => closeOpenTrade("manual")} className="rounded-xl bg-[#F0B429] px-4 py-3 text-sm font-black text-black">Close position</button>
                      <button onClick={moveStopToBreakEven} className="rounded-xl border border-[#1E1E38] px-4 py-3 text-xs font-bold text-zinc-300 hover:text-[#F0B429]">Move SL to BE</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => openPosition("long")} disabled={!currentCandle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D084] px-4 py-3 text-sm font-black text-black disabled:opacity-50"><TrendingUp size={16} /> BUY</button>
                      <button onClick={() => openPosition("short")} disabled={!currentCandle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4565] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><TrendingDown size={16} /> SELL</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {bottomTab === "trades" && (
              trades.length === 0 ? <p className="rounded-xl border border-dashed border-[#2A2A3C] p-6 text-center text-sm text-zinc-500">No closed trades yet.</p> : (
                <table className="w-full min-w-[980px] text-left text-xs">
                  <thead className="uppercase tracking-widest text-zinc-600"><tr><th className="py-2">#</th><th>Side</th><th>Entry</th><th>Exit</th><th>Qty</th><th>P&L</th><th>R</th><th>Reason</th><th>Balance</th><th>Setup</th></tr></thead>
                  <tbody>{trades.map((trade, index) => <tr key={trade.id} className="border-t border-[#1E1E38]"><td className="py-2 text-zinc-500">{index + 1}</td><td className={trade.side === "long" ? "text-[#00D084]" : "text-[#FF4565]"}>{trade.side.toUpperCase()}</td><td>{trade.entryPrice.toFixed(2)}</td><td>{trade.exitPrice.toFixed(2)}</td><td>{trade.quantity.toFixed(5)}</td><td className={trade.pnl >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>{signedMoney(trade.pnl)}</td><td>{trade.rMultiple >= 0 ? "+" : ""}{trade.rMultiple.toFixed(2)}R</td><td className="text-zinc-400">{trade.exitReason}</td><td>{money(trade.balanceAfter)}</td><td>{trade.setup}</td></tr>)}</tbody>
                </table>
              )
            )}

            {bottomTab === "stats" && (
              <div className="grid gap-3 md:grid-cols-4">
                <TerminalMetric label="Trades" value={String(stats.trades)} />
                <TerminalMetric label="Profit Factor" value={stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)} tone={stats.profitFactor >= 1 ? "green" : "red"} />
                <TerminalMetric label="Expectancy" value={`${stats.expectancyR >= 0 ? "+" : ""}${stats.expectancyR.toFixed(2)}R`} tone={stats.expectancyR >= 0 ? "green" : "red"} />
                <TerminalMetric label="Max DD" value={money(stats.maxDrawdown)} tone="red" />
                <TerminalMetric label="Best R" value={`${stats.bestTradeR >= 0 ? "+" : ""}${stats.bestTradeR.toFixed(2)}R`} tone="green" />
                <TerminalMetric label="Worst R" value={`${stats.worstTradeR >= 0 ? "+" : ""}${stats.worstTradeR.toFixed(2)}R`} tone="red" />
                <TerminalMetric label="Wins" value={String(stats.wins)} tone="green" />
                <TerminalMetric label="Losses" value={String(stats.losses)} tone="red" />
              </div>
            )}

            {bottomTab === "strategy" && (
              strategyResult ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <TerminalMetric label="Trades" value={String(strategyResult.stats.trades)} />
                    <TerminalMetric label="Win Rate" value={`${(strategyResult.stats.winRate * 100).toFixed(1)}%`} tone="gold" />
                    <TerminalMetric label="Net P&L" value={signedMoney(strategyResult.stats.netPnl)} tone={strategyResult.stats.netPnl >= 0 ? "green" : "red"} />
                    <TerminalMetric label="Return" value={pct(strategyResult.stats.returnPercent)} tone={strategyResult.stats.returnPercent >= 0 ? "green" : "red"} />
                    <TerminalMetric label="Profit Factor" value={strategyResult.stats.profitFactor >= 99 ? "∞" : strategyResult.stats.profitFactor.toFixed(2)} tone={strategyResult.stats.profitFactor >= 1 ? "green" : "red"} />
                    <TerminalMetric label="Expectancy" value={`${strategyResult.stats.expectancyR >= 0 ? "+" : ""}${strategyResult.stats.expectancyR.toFixed(2)}R`} tone={strategyResult.stats.expectancyR >= 0 ? "green" : "red"} />
                    <TerminalMetric label="Max DD" value={money(strategyResult.stats.maxDrawdown)} tone="red" />
                    <TerminalMetric label="Wins/Loss" value={`${strategyResult.stats.wins}/${strategyResult.stats.losses}`} />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Strategy summary</p>
                    <p className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3 text-xs leading-relaxed text-zinc-300">{strategySummary}</p>
                  </div>
                  {strategyResult.trades.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#2A2A3C] p-6 text-center text-sm text-zinc-500">No trades generated. Try a different symbol, timeframe, or MA period.</p>
                  ) : (
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full min-w-[980px] text-left text-xs">
                        <thead className="uppercase tracking-widest text-zinc-600"><tr><th className="py-2">#</th><th>Side</th><th>Entry</th><th>Exit</th><th>Qty</th><th>P&L</th><th>R</th><th>Reason</th></tr></thead>
                        <tbody>{strategyResult.trades.map((trade, index) => <tr key={trade.id} className="border-t border-[#1E1E38]"><td className="py-2 text-zinc-500">{index + 1}</td><td className={trade.side === "long" ? "text-[#00D084]" : "text-[#FF4565]"}>{trade.side.toUpperCase()}</td><td>{trade.entryPrice.toFixed(2)}</td><td>{trade.exitPrice.toFixed(2)}</td><td>{trade.quantity.toFixed(5)}</td><td className={trade.pnl >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>{signedMoney(trade.pnl)}</td><td>{trade.rMultiple >= 0 ? "+" : ""}{trade.rMultiple.toFixed(2)}R</td><td className="text-zinc-400">{trade.exitReason}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#2A2A3C] p-6 text-center">
                  <p className="text-sm text-zinc-500">Run the Strategy Tester to auto-generate trades with the configured MA-cross / mean-reversion rules.</p>
                  <button onClick={runStrategyBacktest} disabled={!candles.length} className="mt-4 rounded-xl bg-[#2962ff] px-4 py-3 text-sm font-black text-white disabled:opacity-50">Run Strategy</button>
                </div>
              )
            )}

            {bottomTab === "journal" && (
              <div className="grid gap-3 md:grid-cols-2">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-32 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3 text-sm text-white" placeholder="Backtest journal notes, market context, mistakes, lessons…" />
                <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-4 text-sm leading-relaxed text-zinc-400">
                  <p className="font-bold text-white">Review prompt</p>
                  <p className="mt-2">After each session, ask: did the tested strategy still match the playbook rules, or did discretion change the result?</p>
                </div>
              </div>
            )}

            {bottomTab === "sessions" && (
              savedSessions.length === 0 ? <p className="text-sm text-zinc-500">No saved sessions yet.</p> : <div className="grid gap-3 md:grid-cols-3">{savedSessions.map((session) => <div key={session.id} className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3"><p className="font-bold text-white">{session.name}</p><p className="mt-1 text-xs text-zinc-500">{session.symbol} · {session.timeframe} · {money(Number(session.current_balance || session.starting_balance))}</p></div>)}</div>
            )}

            {bottomTab === "data" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-[#F0B429]">
                    <Upload size={14} /> Upload CSV candles
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { setDataSource("csv"); setCsv(await file.text()); } }} />
                  </label>
                  <span className="text-xs text-zinc-500">CSV format: time, open, high, low, close, volume. Use this for forex, futures, indices, or exported TradingView data.</span>
                </div>
                <textarea value={csv} onChange={(event) => setCsv(event.target.value)} className="h-36 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3 font-mono2 text-xs text-white" />
              </div>
            )}
          </div>
        </div>

        {settingsOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono2 text-xs uppercase tracking-widest text-[#F0B429]">Backtest settings</p>
                  <h2 className="mt-1 text-xl font-black text-white">Select historical date, time and data source</h2>
                </div>
                <button onClick={() => setSettingsOpen(false)} className="rounded-xl border border-[#1E1E38] p-2 text-zinc-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Data source">
                  <select value={dataSource} onChange={(event) => setDataSource(event.target.value as DataSource)} className={terminalInput}>
                    <option value="market">Crypto / Forex / Metals</option>
                    <option value="csv">Custom CSV candles</option>
                  </select>
                </Field>
                <Field label="Symbol">
                {dataSource === "market" ? (
                  <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className={terminalInput}>{MARKETS.map((m) => <option key={m.symbol} value={m.symbol}>{m.label}</option>)}</select>
                ) : (
                  <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} className={terminalInput} />
                )}
                </Field>
                <Field label="From date"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={terminalInput} /></Field>
                <Field label="From time"><input type="time" value={fromTime} onChange={(event) => setFromTime(event.target.value)} className={terminalInput} /></Field>
                <Field label="To date"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={terminalInput} /></Field>
                <Field label="To time"><input type="time" value={toTime} onChange={(event) => setToTime(event.target.value)} className={terminalInput} /></Field>
                <Field label="Timezone">
                  <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={terminalInput}>{TIMEZONES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                </Field>
                <Field label="Starting capital"><input value={startingBalance} onChange={(event) => { setStartingBalance(event.target.value); setBalance(Number(event.target.value) || 0); }} className={terminalInput} /></Field>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button onClick={() => setSettingsOpen(false)} className="rounded-xl border border-[#1E1E38] px-5 py-3 text-sm font-bold text-zinc-300 hover:text-white">Cancel</button>
                <button onClick={() => { setLiveMode(false); setSettingsOpen(false); loadCandles(); }} className="gold-gradient rounded-xl px-5 py-3 text-sm font-black text-black">Start Backtest Replay</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
