"use client";

import { Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import type { BacktestJournalTrade } from "@/lib/backtesting/journal";
import { outcomeOf } from "@/lib/backtesting/journalStats";

function fmt(n: number | null) {
  return n == null ? "—" : String(n);
}

const resultStyle: Record<string, string> = {
  win: "text-[#00D084] bg-[#00D084]/10 border-[#00D084]/30",
  loss: "text-[#FF4565] bg-[#FF4565]/10 border-[#FF4565]/30",
  be: "text-[#F0B429] bg-[#F0B429]/10 border-[#F0B429]/30",
};

export function TradeRow({
  trade,
  onEdit,
  onDelete,
}: {
  trade: BacktestJournalTrade;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const outcome = outcomeOf(trade);
  const ticks = trade.rule_ticks || [];
  const followed = ticks.filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              trade.side === "long"
                ? "bg-[#00D084]/10 text-[#00D084]"
                : "bg-[#FF4565]/10 text-[#FF4565]"
            }`}
          >
            {trade.side === "long" ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize text-white">
                {trade.side}
              </span>
              {trade.trade_date && (
                <span className="text-xs text-[#8080A0]">
                  {trade.trade_date}
                </span>
              )}
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  resultStyle[outcome] ||
                  "text-[#A0A0C0] bg-[#14141E] border-[#1E1E38]"
                }`}
              >
                {outcome === "unknown" ? "—" : outcome.toUpperCase()}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-[#8080A0]">
              P {fmt(trade.entry_price)} · SL {fmt(trade.stop_loss)} · T{" "}
              {fmt(trade.take_profit)} · BE {fmt(trade.be)}
              {trade.risk != null && (
                <span>
                  {" "}
                  · Risk {trade.risk}
                  {trade.risk_unit === "percent" ? "%" : "$"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ticks.length > 0 && (
            <span className="hidden sm:inline-flex items-center rounded-full border border-[#1E1E38] bg-[#111120] px-2.5 py-1 text-xs text-[#8080A0]">
              {followed}/{ticks.length} rules
            </span>
          )}
          <button
            onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E1E38] bg-[#161628] text-[#A0A0C0] transition hover:bg-[#1E1E38] hover:text-white"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF4565]/20 bg-[#FF4565]/[0.03] text-[#FF4565] transition hover:bg-[#FF4565]/10"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {(trade.deviations || trade.psychology) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {trade.deviations && (
            <div className="rounded-xl border border-[#1E1E38] bg-[#161628] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A80]">
                Change
              </p>
              <p className="mt-1 whitespace-pre-wrap break-all text-sm text-[#A0A0C0]">
                {trade.deviations}
              </p>
            </div>
          )}
          {trade.psychology && (
            <div className="rounded-xl border border-[#1E1E38] bg-[#161628] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A80]">
                Psychology
              </p>
              <p className="mt-1 whitespace-pre-wrap break-all text-sm text-[#A0A0C0]">
                {trade.psychology}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
