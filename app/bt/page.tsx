"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getModels,
  getTrades,
  getProfile,
  saveProfile,
  type BacktestModel,
  type BacktestJournalTrade,
  type BacktestProfile,
} from "@/lib/backtesting/journal";
import { computeJournalStats } from "@/lib/backtesting/journalStats";
import { Layers3, ListChecks, Target, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";

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

export default function BacktestDashboard() {
  const { user } = useAuth();
  const [models, setModels] = useState<BacktestModel[]>([]);
  const [trades, setTrades] = useState<BacktestJournalTrade[]>([]);
  const [profile, setProfile] = useState<BacktestProfile | null>(null);
  const [acct, setAcct] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [m, p] = await Promise.all([getModels(), getProfile()]);
        if (!active) return;
        setModels(m);
        setProfile(p);
        setAcct(p ? String(p.account_size) : "0");
        setCurrency(p ? p.currency : "USD");
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

  async function handleSaveAcct() {
    setSaving(true);
    try {
      await saveProfile(Number(acct) || 0, currency);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Backtesting"
      subtitle={`${models.length} models · ${stats.total} journal trades`}
    >
      <div className="space-y-5">
        {/* Account Size hero */}
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
                  {currency === "USD" ? "$" : currency}
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
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
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
                disabled={saving}
                className="rounded-xl bg-[#F0B429] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#d99f1e] disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Card>

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

        <Card className="overflow-hidden border-[#1E1E38]">
          <div className="flex items-center justify-between border-b border-[#1E1E38] px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Your Models</h2>
            <Link
              href="/bt/playbook"
              className="text-xs font-semibold text-[#F0B429] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="text-sm text-[#8080A0]">Loading…</p>
            ) : models.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#8080A0]">
                  No models yet. Create your first strategy model to start
                  journaling backtests.
                </p>
                <Link
                  href="/bt/playbook"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F0B429] px-4 py-2.5 text-sm font-semibold text-black"
                >
                  Open Playbook
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {models.slice(0, 5).map((m) => {
                  const s = computeJournalStats(
                    trades.filter((t) => t.session_id === m.id)
                  );
                  return (
                    <Link
                      key={m.id}
                      href={`/bt/playbook/${m.id}`}
                      className="flex items-center justify-between rounded-xl border border-[#1E1E38] bg-[#161628] px-4 py-3 transition hover:border-[#F0B429]/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {m.name}
                        </p>
                        <p className="text-xs text-[#8080A0]">
                          {[m.market, m.timeframe].filter(Boolean).join(" · ")} ·{" "}
                          {(m.rules || []).length} rules
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[#8080A0]">{s.total} trades</span>
                        <span
                          className={
                            s.winRate >= 50 ? "text-[#00D084]" : "text-[#FF4565]"
                          }
                        >
                          {s.winRate.toFixed(0)}% WR
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
