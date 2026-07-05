import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { BarChart3, CandlestickChart, History, Play, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Backtesting Lab | ProfitPnL",
  description: "Replay historical candles, trade with demo capital, and save backtest sessions inside ProfitPnL.",
};

export default function BacktestingPage() {
  return (
    <AppShell title="Backtesting" subtitle="Test your edge before risking real capital.">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="border-[#F0B429]/25 bg-gradient-to-br from-[#15120A] to-[#11111B] p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono2 text-xs uppercase tracking-widest text-[#F0B429]">Replay Engine</p>
              <h1 className="mt-3 text-3xl font-black text-white">TradingView-style Backtesting Lab</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                Load candles, hide the future, replay one candle at a time, place demo trades, manage SL/TP, and save your tested edge to ProfitPnL.
              </p>
            </div>
            <Link href="/backtesting/terminal" className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-black">
              <Play size={16} /> Open Terminal
            </Link>
          </div>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: CandlestickChart, title: "Replay candles", desc: "Step, play, pause, and hide future candles for honest manual testing." },
            { icon: ShieldCheck, title: "Demo capital", desc: "Simulate account balance, risk percent, quantity, SL/TP, and P&L." },
            { icon: BarChart3, title: "Backtest stats", desc: "Track win rate, expectancy, profit factor, drawdown, and R-multiple." },
            { icon: History, title: "Save sessions", desc: "Store backtest sessions and trades for later review and comparison." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0B429]/10 text-[#F0B429]"><Icon size={21} /></div>
                <h2 className="mt-4 text-lg font-bold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
