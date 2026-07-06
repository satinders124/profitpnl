"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getModels,
  getTrades,
  type BacktestModel,
  type BacktestJournalTrade,
} from "@/lib/backtesting/journal";
import { computeJournalStats } from "@/lib/backtesting/journalStats";
import { Layers3, ListChecks, Target, TrendingUp } from "lucide-react";

function Metric({
  icon,
  label,
  value,
  sub,
  tone = "gold",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "green" | "red" | "gold";
}) {
  const color = tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : "#F0B429";
  return (
    <Card className="border-[#1E1E38] p-5 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#8080A0]">
          {label}
        </div>
        <div style={{ color }}>{icon}</div>
      </div>
      <div
        className="mt-3 text-2xl font-bold tabular-nums tracking-tight md:text-3xl"
        style={{ color }}
        title={value}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-[#8080A0]">{sub}</div>
    </Card>
  );
}

export default function BacktestAnalytics() {
  const { user } = useAuth();
  const [models, setModels] = useState<BacktestModel[]>([]);
  const [trades, setTrades] = useState<BacktestJournalTrade[]>([]);
  const [loading, setLoading] = useState(true);

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

  const stats = computeJournalStats(trades);
  const byModel = useMemo(
    () =>
      models.map((m) => ({
        model: m,
        stats: computeJournalStats(
          trades.filter((t) => t.session_id === m.id)
        ),
      })),
    [models, trades]
  );

  return (
    <AppShell
      title="Backtesting Analytics"
      subtitle={`${stats.total} journal trades`}
    >
      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<Layers3 size={18} />}
            label="Models"
            value={String(models.length)}
            sub="Strategy models"
          />
          <Metric
            icon={<ListChecks size={18} />}
            label="Journal Trades"
            value={String(stats.total)}
            sub="Backtested trades"
          />
          <Metric
            icon={<Target size={18} />}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.wins}W / ${stats.losses}L / ${stats.be}BE`}
            tone={stats.winRate >= 50 ? "green" : "gold"}
          />
          <Metric
            icon={<TrendingUp size={18} />}
            label="Expectancy"
            value={`${stats.expectancyR >= 0 ? "+" : ""}${stats.expectancyR.toFixed(2)}R`}
            sub="Per trade (avg)"
            tone={stats.expectancyR >= 0 ? "green" : "red"}
          />
        </section>

        <Card className="border-[#1E1E38] p-5">
          <h2 className="text-sm font-semibold text-white">
            Outcome Distribution
          </h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#1E1E38]">
            <div
              className="bg-[#00D084]"
              style={{ width: `${stats.total ? (stats.wins / stats.total) * 100 : 0}%` }}
            />
            <div
              className="bg-[#F0B429]"
              style={{ width: `${stats.total ? (stats.be / stats.total) * 100 : 0}%` }}
            />
            <div
              className="bg-[#FF4565]"
              style={{ width: `${stats.total ? (stats.losses / stats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-[#00D084]/10 px-2 py-2 text-[#00D084]">
              {stats.wins}W
            </div>
            <div className="rounded-xl bg-[#14141E] px-2 py-2 text-[#A0A0C0]">
              {stats.be}BE
            </div>
            <div className="rounded-xl bg-[#FF4565]/10 px-2 py-2 text-[#FF4565]">
              {stats.losses}L
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-[#1E1E38]">
          <div className="border-b border-[#1E1E38] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Edge by Model</h2>
          </div>
          <div className="space-y-2 p-5">
            {loading ? (
              <p className="text-sm text-[#8080A0]">Loading…</p>
            ) : byModel.length === 0 ? (
              <p className="text-sm text-[#8080A0]">No models yet.</p>
            ) : (
              byModel.map(({ model, stats: s }) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between rounded-xl border border-[#1E1E38] bg-[#161628] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {model.name}
                    </p>
                    <p className="text-xs text-[#8080A0]">{s.total} trades</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={
                        s.winRate >= 50 ? "text-[#00D084]" : "text-[#FF4565]"
                      }
                    >
                      {s.winRate.toFixed(0)}% WR
                    </span>
                    <span
                      className={
                        s.expectancyR >= 0 ? "text-[#00D084]" : "text-[#FF4565]"
                      }
                    >
                      {s.expectancyR >= 0 ? "+" : ""}
                      {s.expectancyR.toFixed(2)}R
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
