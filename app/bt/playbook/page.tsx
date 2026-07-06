"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getModels,
  getTrades,
  createModel,
  updateModel,
  deleteModel,
  type BacktestModel,
  type BacktestJournalTrade,
} from "@/lib/backtesting/journal";
import { ModelCard } from "@/components/backtesting/journal/ModelCard";
import { ModelForm, type ModelFormPayload } from "@/components/backtesting/journal/ModelForm";
import { Plus } from "lucide-react";

export default function BacktestPlaybook() {
  const { user } = useAuth();
  const [models, setModels] = useState<BacktestModel[]>([]);
  const [tradeMap, setTradeMap] = useState<Map<string, BacktestJournalTrade[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BacktestModel | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const m = await getModels();
        if (!active) return;
        setModels(m);
        const allTrades = await Promise.all(m.map((model) => getTrades(model.id)));
        if (!active) return;
        const map = new Map<string, BacktestJournalTrade[]>();
        m.forEach((model, i) => map.set(model.id, allTrades[i]));
        setTradeMap(map);
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

  async function load() {
    if (!user) return;
    const m = await getModels();
    setModels(m);
    const allTrades = await Promise.all(m.map((model) => getTrades(model.id)));
    const map = new Map<string, BacktestJournalTrade[]>();
    m.forEach((model, i) => map.set(model.id, allTrades[i]));
    setTradeMap(map);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(m: BacktestModel) {
    setEditing(m);
    setModalOpen(true);
  }

  async function handleSave(payload: ModelFormPayload) {
    if (editing) await updateModel(editing.id, payload);
    else await createModel(payload);
    setModalOpen(false);
    setEditing(null);
    await load();
  }

  async function handleDelete(m: BacktestModel) {
    if (!confirm(`Delete "${m.name}"? This also deletes its trades.`)) return;
    await deleteModel(m.id);
    await load();
  }

  return (
    <AppShell
      title="Backtesting Playbook"
      subtitle={`${models.length} strategy models`}
      actionLabel="+ New Model"
      onAction={openCreate}
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-[#8080A0]">Loading…</p>
        ) : models.length === 0 ? (
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.13),transparent_45%)]" />
              <div className="relative flex flex-col items-center px-6 py-16 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F0B429]/10 text-[#F0B429]">
                  <Plus size={30} />
                </div>
                <h2 className="text-2xl font-semibold text-white">
                  Build your first strategy model
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8080A0]">
                  Define your setup and the rules of your strategy. Then add
                  backtested trades and tick every rule you followed.
                </p>
                <button
                  onClick={openCreate}
                  className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#F0B429] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#d99f1e]"
                >
                  <Plus size={17} /> Create First Model
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {models.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                trades={tradeMap.get(m.id) || []}
                onEdit={() => openEdit(m)}
                onDelete={() => handleDelete(m)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Strategy Model" : "New Strategy Model"}
      >
        <ModelForm
          existing={editing}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      </Modal>
    </AppShell>
  );
}
