"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getModel,
  createTrade,
  updateTrade,
  deleteTrade,
  updateModel,
  deleteModel,
  type BacktestModel,
  type BacktestJournalTrade,
} from "@/lib/backtesting/journal";
import { computeJournalStats } from "@/lib/backtesting/journalStats";
import { ModelForm, type ModelFormPayload } from "@/components/backtesting/journal/ModelForm";
import { TradeForm } from "@/components/backtesting/journal/TradeForm";
import { TradeRow } from "@/components/backtesting/journal/TradeRow";
import { BookOpen, CheckCircle2, Plus } from "lucide-react";

export default function ModelDetail() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();

  const [model, setModel] = useState<BacktestModel | null>(null);
  const [trades, setTrades] = useState<BacktestJournalTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeModal, setTradeModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<BacktestJournalTrade | null>(
    null
  );
  const [modelModal, setModelModal] = useState(false);

  async function load() {
    if (!user) return;
    try {
      const { session, trades: t } = await getModel(id);
      setModel(session);
      setTrades(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const stats = computeJournalStats(trades);
  const rules = model?.rules || [];

  async function handleSaveTrade(payload: Record<string, unknown>) {
    if (editingTrade) await updateTrade(editingTrade.id, payload);
    else await createTrade(id, payload);
    setTradeModal(false);
    setEditingTrade(null);
    await load();
  }
  async function handleDeleteTrade(t: BacktestJournalTrade) {
    if (!confirm("Delete this trade?")) return;
    await deleteTrade(t.id);
    await load();
  }
  async function handleSaveModel(payload: ModelFormPayload) {
    if (model) await updateModel(model.id, payload);
    setModelModal(false);
    await load();
  }
  async function handleDeleteModel() {
    if (!confirm(`Delete "${model?.name}" and all its trades?`)) return;
    await deleteModel(model!.id);
    window.location.href = "/bt/playbook";
  }

  function Metric({
    label,
    value,
    sub,
    tone = "gold",
  }: {
    label: string;
    value: string;
    sub: string;
    tone?: "green" | "red" | "gold";
  }) {
    const color =
      tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : "#F0B429";
    return (
      <Card className="border-[#1E1E38] p-5 shadow-md">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#8080A0]">
          {label}
        </div>
        <div
          className="mt-3 text-2xl font-bold tabular-nums tracking-tight"
          style={{ color }}
        >
          {value}
        </div>
        <div className="mt-1 text-xs font-medium text-[#8080A0]">{sub}</div>
      </Card>
    );
  }

  if (loading) {
    return (
      <AppShell title="Model">
        <p className="text-sm text-[#8080A0]">Loading…</p>
      </AppShell>
    );
  }
  if (!model) {
    return (
      <AppShell title="Model">
        <p className="text-sm text-[#8080A0]">Model not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={model.name}
      subtitle={`${rules.length} rules · ${stats.total} trades`}
      actionLabel="+ Add Trade"
      onAction={() => {
        setEditingTrade(null);
        setTradeModal(true);
      }}
    >
      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Trades"
            value={String(stats.total)}
            sub="Backtested"
            tone="gold"
          />
          <Metric
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.wins}W / ${stats.losses}L / ${stats.be}BE`}
            tone={stats.winRate >= 50 ? "green" : "gold"}
          />
          <Metric
            label="Expectancy"
            value={`${stats.expectancyR >= 0 ? "+" : ""}${stats.expectancyR.toFixed(2)}R`}
            sub="Per trade (avg)"
            tone={stats.expectancyR >= 0 ? "green" : "red"}
          />
          <Metric
            label="Rules"
            value={String(rules.length)}
            sub="In checklist"
            tone="gold"
          />
        </section>

        <Card className="border-[#1E1E38]">
          <div className="flex items-center justify-between border-b border-[#1E1E38] px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <BookOpen size={16} className="text-[#F0B429]" /> Strategy Rules
            </h2>
            <button
              onClick={() => setModelModal(true)}
              className="text-xs font-semibold text-[#F0B429] hover:underline"
            >
              Edit model
            </button>
          </div>
          <div className="p-5">
            {rules.length === 0 ? (
              <p className="text-sm text-[#8080A0]">
                No rules defined. Edit the model to add your strategy rules.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rules.map((r, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded-xl border border-[#1E1E38] bg-[#161628] px-3 py-2"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00D084]" />
                    <p className="whitespace-pre-wrap break-all text-sm text-[#A0A0C0]">
                      {r}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {model.notes && (
              <p className="mt-4 whitespace-pre-wrap break-all text-sm leading-6 text-[#8080A0]">
                {model.notes}
              </p>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden border-[#1E1E38]">
          <div className="flex items-center justify-between border-b border-[#1E1E38] px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle2 size={16} className="text-[#00D084]" /> Backtested
              Trades
            </h2>
            <button
              onClick={handleDeleteModel}
              className="text-xs font-semibold text-[#FF4565] hover:underline"
            >
              Delete model
            </button>
          </div>
          <div className="space-y-2 p-5">
            {trades.length === 0 ? (
              <p className="text-sm text-[#8080A0]">
                No trades yet. Click “+ Add Trade” and tick every rule you
                followed.
              </p>
            ) : (
              trades.map((t) => (
                <TradeRow
                  key={t.id}
                  trade={t}
                  onEdit={() => {
                    setEditingTrade(t);
                    setTradeModal(true);
                  }}
                  onDelete={() => handleDeleteTrade(t)}
                />
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={tradeModal}
        onClose={() => {
          setTradeModal(false);
          setEditingTrade(null);
        }}
        title={editingTrade ? "Edit Trade" : "Add Backtest Trade"}
        size="lg"
      >
        <TradeForm
          model={model}
          existing={editingTrade}
          onCancel={() => {
            setTradeModal(false);
            setEditingTrade(null);
          }}
          onSave={handleSaveTrade}
        />
      </Modal>

      <Modal
        isOpen={modelModal}
        onClose={() => setModelModal(false)}
        title="Edit Strategy Model"
      >
        <ModelForm
          existing={model}
          onCancel={() => setModelModal(false)}
          onSave={handleSaveModel}
        />
      </Modal>
    </AppShell>
  );
}
