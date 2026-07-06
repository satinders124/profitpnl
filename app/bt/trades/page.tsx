"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getModels,
  getTrades,
  type BacktestModel,
  type BacktestJournalTrade,
} from "@/lib/backtesting/journal";
import { outcomeOf } from "@/lib/backtesting/journalStats";
import Link from "next/link";

export default function BacktestTradesPage() {
  const { user } = useAuth();
  const [models, setModels] = useState<BacktestModel[]>([]);
  const [trades, setTrades] = useState<BacktestJournalTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const m = await getModels();
        if (!active) return;
        setModels(m);
        const all = await Promise.all(m.map((model) => getTrades(model.id)));
        if (!active) return;
        setTrades(all.flat());
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const modelName = (id: string) =>
    models.find((m) => m.id === id)?.name || "—";

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (modelFilter !== "all" && t.session_id !== modelFilter) return false;
      if (resultFilter !== "all") {
        const o = outcomeOf(t);
        if (resultFilter === "unknown" ? o !== "unknown" : o !== resultFilter)
          return false;
      }
      return true;
    });
  }, [trades, modelFilter, resultFilter]);

  return (
    <AppShell
      title="Backtesting Trade Log"
      subtitle={`${trades.length} journal trades`}
    >
      <div className="space-y-4">
        <Card className="border-[#1E1E38] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="all">All Models</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3 py-2.5 text-sm text-white outline-none"
            >
              <option value="all">All Results</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="be">Breakeven</option>
            </select>
            <span className="sm:ml-auto text-xs text-[#8080A0]">
              {filtered.length} shown
            </span>
          </div>
        </Card>

        {loading ? (
          <p className="text-sm text-[#8080A0]">Loading…</p>
        ) : trades.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-[#8080A0]">
              No backtest trades yet. Open a model and add your first trade.
            </p>
            <Link
              href="/bt/playbook"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F0B429] px-4 py-2.5 text-sm font-semibold text-black"
            >
              Go to Playbook
            </Link>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-[#8080A0]">
              No trades match these filters.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const o = outcomeOf(t);
              return (
                <Link
                  key={t.id}
                  href={`/bt/playbook/${t.session_id}`}
                  className="block rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4 transition hover:border-[#F0B429]/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold capitalize text-white">
                        {t.side}{" "}
                        <span className="text-[#8080A0]">·</span>{" "}
                        <span className="text-[#8080A0] font-normal">
                          {modelName(t.session_id)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[#8080A0]">
                        {t.trade_date || "—"} · P {t.entry_price ?? "—"} · SL{" "}
                        {t.stop_loss ?? "—"} · T {t.take_profit ?? "—"} · BE{" "}
                        {t.be ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        o === "win"
                          ? "text-[#00D084] bg-[#00D084]/10 border-[#00D084]/30"
                          : o === "loss"
                            ? "text-[#FF4565] bg-[#FF4565]/10 border-[#FF4565]/30"
                            : "text-[#F0B429] bg-[#F0B429]/10 border-[#F0B429]/30"
                      }`}
                    >
                      {o.toUpperCase()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
