"use client";

import Link from "next/link";
import { ListChecks, Pencil, Trash2, TrendingUp } from "lucide-react";
import type {
  BacktestModel,
  BacktestJournalTrade,
} from "@/lib/backtesting/journal";
import { computeJournalStats } from "@/lib/backtesting/journalStats";

export function ModelCard({
  model,
  trades,
  onEdit,
  onDelete,
}: {
  model: BacktestModel;
  trades: BacktestJournalTrade[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stats = computeJournalStats(trades);
  const rules = model.rules || [];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] shadow-xl shadow-black/20 transition hover:border-[#F0B429]/30">
      <div className="h-1 bg-gradient-to-r from-[#F0B429] via-yellow-200 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#1E1E38] bg-[#0D0D1A] px-2.5 py-1 text-xs font-semibold text-[#F0B429]">
                {model.status || "Active"}
              </span>
              {(model.market || model.timeframe) && (
                <span className="rounded-full border border-[#1E1E38] bg-[#0D0D1A] px-2.5 py-1 text-xs text-[#8080A0]">
                  {[model.market, model.timeframe].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <h3 className="mt-3 break-all text-xl font-semibold tracking-tight text-white">
              {model.name}
            </h3>
            {model.notes && (
              <p className="mt-2 max-h-16 overflow-y-auto whitespace-pre-wrap break-all text-sm leading-6 text-[#8080A0]">
                {model.notes}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
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

        <div className="mt-3 flex items-center justify-between text-xs text-[#8080A0]">
          <span className="flex items-center gap-1.5">
            <ListChecks size={13} /> {rules.length} rules
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp size={13} /> {stats.winRate.toFixed(0)}% WR
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/bt/playbook/${model.id}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F0B429] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#d99f1e]"
          >
            Open
          </Link>
          <button
            onClick={onEdit}
            className="inline-flex items-center justify-center rounded-2xl border border-[#1E1E38] bg-[#161628] px-4 py-3 text-sm font-medium text-[#A0A0C0] transition hover:bg-[#1E1E38] hover:text-white"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-2xl border border-[#FF4565]/20 bg-[#FF4565]/[0.03] px-4 py-3 text-sm font-medium text-[#FF4565] transition hover:bg-[#FF4565]/10"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
