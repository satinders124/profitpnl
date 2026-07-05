"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  calculateBacktestStats,
  calculateQuantity,
  closeTrade,
  maybeAutoCloseTrade,
  parseCandlesCsv,
} from "@/lib/backtesting/engine";
import { BINANCE_SYMBOLS, TIMEFRAMES, type BacktestSide, type BacktestTrade, type Candle, type OpenBacktestTrade } from "@/lib/backtesting/types";
import { BarChart3, Download, Loader2, Pause, Play, RefreshCw, Save, SkipForward, Square, TrendingDown, TrendingUp, Upload } from "lucide-react";

const ReplayChart = dynamic(() => import("@/components/backtesting/ReplayChart").then((m) => m.ReplayChart), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading chart…</div>,
});

type DataSource = "binance" | "csv";

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
2026-07-01T09:20:00Z,104,108,103,107,1600`;

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function pct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "green" | "red" | "gold" | "neutral" }) {
  const toneClass = tone === "green" ? "text-[#00D084]" : tone === "red" ? "text-[#FF4565]" : tone === "gold" ? "text-[#F0B429]" : "text-white";
  return (
    <Card className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-2 font-mono2 text-xl font-black ${toneClass}`}>{value}</p>
    </Card>
  );
}

export default function BacktestingLabPage() {
  const { user } = useAuth();
  const [dataSource, setDataSource] = useState<DataSource>("binance");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("5m");
  const [from, setFrom] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [csv, setCsv] = useState(sampleCsv);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  const [sessionName, setSessionName] = useState("BTCUSDT Replay Backtest");
  const [startingBalance, setStartingBalance] = useState("100000");
  const [balance, setBalance] = useState(100000);
  const [riskPercent, setRiskPercent] = useState("1");
  const [manualQuantity, setManualQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [setup, setSetup] = useState("Backtest setup");
  const [notes, setNotes] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);
  const [openTrade, setOpenTrade] = useState<OpenBacktestTrade | null>(null);
  const [trades, setTrades] = useState<BacktestTrade[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  const numericStartingBalance = Number(startingBalance) || 0;
  const currentCandle = candles[currentIndex] || null;
  const visibleCandles = useMemo(() => candles.slice(0, Math.max(1, currentIndex + 1)), [candles, currentIndex]);
  const stats = useMemo(() => calculateBacktestStats(trades, numericStartingBalance || 1), [trades, numericStartingBalance]);

  const loadSavedSessions = useCallback(async () => {
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/backtests/sessions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.ok) setSavedSessions(json.sessions || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSavedSessions();
  }, [loadSavedSessions]);

  const loadCandles = useCallback(async () => {
    setLoadingData(true);
    setDataError("");
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
        return;
      }

      const params = new URLSearchParams({ symbol, timeframe, from, to, provider: "binance" });
      const res = await fetch(`/api/market-data/candles?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load market data.");
      if (!json.candles?.length) throw new Error("No candles returned for that range.");
      setCandles(json.candles);
      setSessionName(`${symbol} ${timeframe} Replay Backtest`);
    } catch (error) {
      setCandles([]);
      setDataError(error instanceof Error ? error.message : "Could not load candles.");
    } finally {
      setLoadingData(false);
    }
  }, [csv, dataSource, from, startingBalance, symbol, timeframe, to]);

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

  function openPosition(side: BacktestSide) {
    if (!currentCandle || openTrade) return;
    const entry = currentCandle.close;
    const sl = Number(stopLoss) || (side === "long" ? entry * 0.99 : entry * 1.01);
    const tp = Number(takeProfit) || (side === "long" ? entry * 1.02 : entry * 0.98);
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
          market: dataSource === "binance" ? "Crypto" : "Custom CSV",
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
    a.download = `${symbol}-${timeframe}-backtest-trades.csv`;
    a.click();
  }

  return (
    <AppShell title="Backtesting Lab" subtitle="Replay markets, trade with demo capital, and save your tested edge.">
      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <Card className="p-4">
            <div className="mb-4 grid gap-3 md:grid-cols-5">
              <div>
                <label className="text-xs font-semibold text-zinc-500">Data source</label>
                <select value={dataSource} onChange={(e) => setDataSource(e.target.value as DataSource)} className="mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none">
                  <option value="binance">Binance crypto</option>
                  <option value="csv">Custom CSV candles</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Symbol</label>
                {dataSource === "binance" ? (
                  <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none">
                    {BINANCE_SYMBOLS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                ) : (
                  <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none" />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Timeframe</label>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none">
                  {TIMEFRAMES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>

            {dataSource === "csv" && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold text-zinc-500">CSV candles (time, open, high, low, close, volume)</label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#1E1E38] px-3 py-1.5 text-xs font-bold text-[#F0B429]">
                    <Upload size={14} /> Upload
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setCsv(await file.text());
                    }} />
                  </label>
                </div>
                <textarea value={csv} onChange={(e) => setCsv(e.target.value)} className="h-32 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3 font-mono2 text-xs text-white outline-none" />
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-zinc-400">
                {loadingData ? "Loading market data…" : `${candles.length} candles loaded · Candle ${Math.min(currentIndex + 1, candles.length)} / ${candles.length}`}
                {dataError && <span className="ml-2 text-red-400">{dataError}</span>}
              </div>
              <button onClick={loadCandles} disabled={loadingData} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-[#F0B429] disabled:opacity-50">
                {loadingData ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reload
              </button>
            </div>

            <div className="h-[520px] overflow-hidden rounded-2xl border border-[#1E1E38] bg-[#070712]">
              {visibleCandles.length ? <ReplayChart candles={visibleCandles} openTrade={openTrade} /> : <div className="flex h-full items-center justify-center text-zinc-500">Load data to start replay.</div>}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setPlaying((v) => !v)} disabled={!candles.length} className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">
                {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "Pause" : "Play"}
              </button>
              <button onClick={advanceOne} disabled={!candles.length} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-4 py-2.5 text-sm font-bold text-zinc-300 hover:text-[#F0B429]"><SkipForward size={16} /> Step</button>
              <button onClick={resetSession} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-4 py-2.5 text-sm font-bold text-zinc-300 hover:text-[#F0B429]"><Square size={16} /> Reset</button>
              <select value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value))} className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-2.5 text-sm text-white outline-none">
                <option value={1000}>1x</option>
                <option value={700}>2x</option>
                <option value={350}>5x</option>
                <option value={150}>10x</option>
              </select>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <p className="font-mono2 text-xs uppercase tracking-widest text-[#F0B429]">Demo account</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Balance" value={money(balance)} tone={balance >= numericStartingBalance ? "green" : "red"} />
                <Stat label="Net P&L" value={money(stats.netPnl)} tone={stats.netPnl >= 0 ? "green" : "red"} />
                <Stat label="Return" value={pct(stats.returnPercent)} tone={stats.returnPercent >= 0 ? "green" : "red"} />
                <Stat label="Win Rate" value={`${(stats.winRate * 100).toFixed(1)}%`} tone="gold" />
              </div>
            </Card>

            <Card className="p-5">
              <p className="mb-4 font-mono2 text-xs uppercase tracking-widest text-[#F0B429]">Order panel</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-zinc-500">Starting capital</label><input value={startingBalance} onChange={(e) => { setStartingBalance(e.target.value); setBalance(Number(e.target.value) || 0); }} className="mt-1 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-zinc-500">Risk %</label><input value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} className="mt-1 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-zinc-500">SL</label><input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder={currentCandle ? (currentCandle.close * 0.99).toFixed(2) : ""} className="mt-1 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-zinc-500">TP</label><input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder={currentCandle ? (currentCandle.close * 1.02).toFixed(2) : ""} className="mt-1 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-zinc-500">Qty optional</label><input value={manualQuantity} onChange={(e) => setManualQuantity(e.target.value)} placeholder="auto" className="mt-1 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-sm text-white" /></div>
                <div><label className="text-xs text-zinc-500">Setup</label><input value={setup} onChange={(e) => setSetup(e.target.value)} className="mt-1 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2 text-sm text-white" /></div>
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Backtest notes" className="mt-3 h-20 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3 text-sm text-white" />

              {openTrade ? (
                <div className="mt-4 rounded-xl border border-[#F0B429]/25 bg-[#F0B429]/10 p-3 text-sm text-[#F0B429]">
                  Open {openTrade.side.toUpperCase()} @ {openTrade.entryPrice.toFixed(2)} · Qty {openTrade.quantity.toFixed(5)}
                  <button onClick={() => closeOpenTrade("manual")} className="mt-3 w-full rounded-lg bg-[#F0B429] px-4 py-2 font-black text-black">Close at current price</button>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button onClick={() => openPosition("long")} disabled={!currentCandle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D084] px-4 py-3 text-sm font-black text-black disabled:opacity-50"><TrendingUp size={16} /> Buy</button>
                  <button onClick={() => openPosition("short")} disabled={!currentCandle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4565] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><TrendingDown size={16} /> Sell</button>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Trades" value={String(stats.trades)} />
          <Stat label="Profit Factor" value={stats.profitFactor >= 99 ? "∞" : stats.profitFactor.toFixed(2)} tone={stats.profitFactor >= 1 ? "green" : "red"} />
          <Stat label="Expectancy" value={`${stats.expectancyR >= 0 ? "+" : ""}${stats.expectancyR.toFixed(2)}R`} tone={stats.expectancyR >= 0 ? "green" : "red"} />
          <Stat label="Max DD" value={money(stats.maxDrawdown)} tone="red" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Backtest trade history</h2>
                <p className="mt-1 text-xs text-zinc-500">Every closed replay trade is stored here before saving.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadTradesCsv} disabled={!trades.length} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-bold text-zinc-300 hover:text-[#F0B429] disabled:opacity-50"><Download size={14} /> CSV</button>
                <button onClick={saveBacktest} disabled={saving || !trades.length} className="gold-gradient inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-black disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
              </div>
            </div>
            {saveMessage && <p className="mb-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-sm text-zinc-300">{saveMessage}</p>}
            {trades.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#2A2A3C] p-8 text-center text-sm text-zinc-500">No trades closed yet. Use Buy/Sell, replay candles, then close or let SL/TP hit.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-widest text-zinc-500"><tr><th className="py-3">#</th><th>Side</th><th>Entry</th><th>Exit</th><th>Qty</th><th>P&L</th><th>R</th><th>Reason</th><th>Balance</th></tr></thead>
                  <tbody>{trades.map((trade, index) => (
                    <tr key={trade.id} className="border-t border-[#1E1E38]"><td className="py-3 text-zinc-500">{index + 1}</td><td className={trade.side === "long" ? "text-[#00D084]" : "text-[#FF4565]"}>{trade.side.toUpperCase()}</td><td>{trade.entryPrice.toFixed(2)}</td><td>{trade.exitPrice.toFixed(2)}</td><td>{trade.quantity.toFixed(5)}</td><td className={trade.pnl >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>{money(trade.pnl)}</td><td className="font-mono2">{trade.rMultiple >= 0 ? "+" : ""}{trade.rMultiple.toFixed(2)}R</td><td className="text-zinc-400">{trade.exitReason}</td><td>{money(trade.balanceAfter)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white"><BarChart3 size={17} className="text-[#F0B429]" /> Saved sessions</h2>
            {savedSessions.length === 0 ? <p className="text-sm text-zinc-500">No saved sessions yet.</p> : (
              <div className="space-y-3">{savedSessions.slice(0, 8).map((session) => (
                <div key={session.id} className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3"><p className="font-bold text-white">{session.name}</p><p className="mt-1 text-xs text-zinc-500">{session.symbol} · {session.timeframe} · {money(Number(session.current_balance || session.starting_balance))}</p></div>
              ))}</div>
            )}
            <div className="mt-5 rounded-xl border border-[#F0B429]/20 bg-[#F0B429]/10 p-3 text-xs leading-relaxed text-[#F0B429]">
              MVP supports instant Binance crypto data and CSV candle upload for any market/timeframe. Forex/futures providers can be plugged into this same engine next.
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
