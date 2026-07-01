"use client";

import { useState } from "react";
import { PlaybookSetup } from "@/types/playbook";
import { BookOpen, CheckCircle2, Save, XCircle } from "lucide-react";

type Props = {
  existing?: PlaybookSetup | null;
  onCancel: () => void;
  onSave: (setup: Partial<PlaybookSetup>) => Promise<void>;
};

const statusOptions = ["Active", "Testing", "Archived"];

function arrayToText(value?: string[]) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function tagsToText(value?: string[]) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function cleanLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PlaybookForm({ existing, onCancel, onSave }: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: existing?.name || "",
    status: existing?.status || "Active",
    market: existing?.market || "",
    timeframe: existing?.timeframe || "",
    directionBias: existing?.directionBias || "",
    description: existing?.description || "",
    entryModel: existing?.entryModel || "",
    invalidation: existing?.invalidation || "",
    targetModel: existing?.targetModel || "",
    riskRule: existing?.riskRule || "",
    rules: arrayToText(existing?.rules),
    mistakesToAvoid: arrayToText(existing?.mistakesToAvoid),
    tags: tagsToText(existing?.tags),
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Strategy name is required.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        id: existing?.id,
        name: form.name.trim(),
        status: form.status,
        market: form.market.trim(),
        timeframe: form.timeframe.trim(),
        directionBias: form.directionBias.trim(),
        description: form.description.trim(),
        entryModel: form.entryModel.trim(),
        invalidation: form.invalidation.trim(),
        targetModel: form.targetModel.trim(),
        riskRule: form.riskRule.trim(),
        rules: cleanLines(form.rules),
        mistakesToAvoid: cleanLines(form.mistakesToAvoid),
        tags: cleanTags(form.tags),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
            <BookOpen size={21} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {existing ? "Edit Playbook Setup" : "Create Playbook Setup"}
            </h2>
            <p className="text-sm text-zinc-400">
              Build a repeatable strategy your trades can be measured against.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Strategy Name *</span>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Example: London Breakout"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Status</span>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status} className="bg-zinc-950">
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Market</span>
            <input
              value={form.market}
              onChange={(e) => updateField("market", e.target.value)}
              placeholder="Forex, Futures, Crypto, Stocks..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Timeframe</span>
            <input
              value={form.timeframe}
              onChange={(e) => updateField("timeframe", e.target.value)}
              placeholder="1m / 5m / 15m / 1H / Daily"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Direction Bias</span>
            <input
              value={form.directionBias}
              onChange={(e) => updateField("directionBias", e.target.value)}
              placeholder="Long only above VWAP, short below previous day low, trend continuation..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              placeholder="Explain when this setup should be used and why it has edge."
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Execution Model
          </h3>

          <div className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Entry Model</span>
              <textarea
                value={form.entryModel}
                onChange={(e) => updateField("entryModel", e.target.value)}
                rows={4}
                placeholder="What confirms your entry? Breakout, retest, liquidity sweep, imbalance, trend shift..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Invalidation</span>
              <textarea
                value={form.invalidation}
                onChange={(e) => updateField("invalidation", e.target.value)}
                rows={4}
                placeholder="When is the idea wrong? Where should stop loss be? What must not happen?"
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Management Model
          </h3>

          <div className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Target Model</span>
              <textarea
                value={form.targetModel}
                onChange={(e) => updateField("targetModel", e.target.value)}
                rows={4}
                placeholder="Where do you take profit? Fixed R, liquidity target, structure target, runner plan..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-zinc-300">Risk Rule</span>
              <textarea
                value={form.riskRule}
                onChange={(e) => updateField("riskRule", e.target.value)}
                rows={4}
                placeholder="Example: Risk 0.5% per trade, stop after 2 losses, no trades after daily drawdown..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Checklist Rules</h3>
            <p className="text-sm text-zinc-400">
              One rule per line. These become your strategy quality checklist.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Setup Rules</span>
            <textarea
              value={form.rules}
              onChange={(e) => updateField("rules", e.target.value)}
              rows={8}
              placeholder={`Trend aligned with higher timeframe\nEntry at planned zone\nStop loss placed before entry\nMinimum 2R target available\nNo revenge or FOMO entry`}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Mistakes To Avoid</span>
            <textarea
              value={form.mistakesToAvoid}
              onChange={(e) => updateField("mistakesToAvoid", e.target.value)}
              rows={8}
              placeholder={`Entering late after move already happened\nMoving stop loss wider\nTaking setup during news\nIgnoring daily loss limit\nTrading outside session`}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm text-zinc-300">Tags</span>
          <input
            value={form.tags}
            onChange={(e) => updateField("tags", e.target.value)}
            placeholder="breakout, london, continuation, high-probability"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/50"
          />
          <p className="text-xs text-zinc-500">Separate tags with commas.</p>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
        >
          <XCircle size={17} />
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={17} />
          {saving ? "Saving..." : existing ? "Save Changes" : "Create Setup"}
        </button>
      </div>
    </form>
  );
}