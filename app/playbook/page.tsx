"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute}  from "@/components/providers/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card}  from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import PlaybookForm from "@/components/playbook/PlaybookForm";
import {
  getPlaybook,
  savePlaybookSetup,
  deletePlaybookSetup,
  getTrades,
} from "@/lib/db";
import { PlaybookSetup } from "@/types/playbook";
import { Trade } from "@/types/trade";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Crosshair,
  Filter,
  Flame,
  Layers3,
  Pencil,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";

type SetupStats = {
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  totalR: number;
  winRate: number;
  expectancy: number;
  avgWinR: number;
  avgLossR: number;
  profitFactor: number;
};

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  // Handles "$1,250", "-$80", "+2R", "53.3%", "1,000"
  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/%/g, "")
    .replace(/r/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function clean(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getFirstNumber(t: any, fields: string[]) {
  for (const field of fields) {
    const value = t[field];

    if (value !== undefined && value !== "") {
      const n = num(value);
      if (Number.isFinite(n) && n !== 0) return n;
    }
  }

  return 0;
}

function getFieldValue(t: any, fields: string[]) {
  for (const field of fields) {
    const value = t[field];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function getTradePnl(trade: Trade) {
  const t = trade as any;

  const pnl = getFirstNumber(t, [
    "pnl",
    "pnlAmount",
    "pnlValue",
    "profitLoss",
    "profit_loss",
    "netPnl",
    "netPNL",
    "netProfit",
    "realizedPnl",
    "realisedPnl",
    "realizedProfit",
    "realisedProfit",
    "resultAmount",
    "amount",
    "pl",
    "p_l",
  ]);

  if (pnl !== 0) return pnl;

  // If user has separate profit/loss amount fields.
  const profit = getFirstNumber(t, ["profit", "profitAmount", "gain"]);
  if (profit !== 0) return Math.abs(profit);

  const loss = getFirstNumber(t, ["loss", "lossAmount"]);
  if (loss !== 0) return -Math.abs(loss);

  return 0;
}

function getStrongActualR(trade: Trade) {
  const t = trade as any;

  // Actual completed R fields.
  // Your current Trade Log saves actual R inside "result"
  // Example: result = 2 or result = -1
  return getFirstNumber(t, [
    "result",
    "rMultiple",
    "r_multiple",
    "resultR",
    "netR",
    "realizedR",
    "realisedR",
    "actualR",
    "tradeR",
    "outcomeR",
  ]);
}

function getWeakR(trade: Trade) {
  const t = trade as any;

  // Some forms use "r" as actual R.
  return getFirstNumber(t, ["r"]);
}

function getPlannedRR(trade: Trade) {
  const t = trade as any;

  // Planned reward:risk, not actual result.
  return getFirstNumber(t, [
    "rr",
    "riskReward",
    "riskRewardRatio",
    "plannedR",
    "plannedRR",
    "rewardRisk",
  ]);
}

function getDirection(trade: Trade) {
  const t = trade as any;

  return clean(
    getFieldValue(t, [
      "direction",
      "side",
      "type",
      "position",
      "tradeType",
      "bias",
    ])
  );
}

function getEntryPrice(trade: Trade) {
  const t = trade as any;

  return getFirstNumber(t, [
    "entry",
    "entryPrice",
    "entry_price",
    "openPrice",
    "avgEntry",
    "averageEntry",
    "entryLevel",
  ]);
}

function getExitPrice(trade: Trade) {
  const t = trade as any;

  return getFirstNumber(t, [
    "exit",
    "exitPrice",
    "exit_price",
    "closePrice",
    "avgExit",
    "averageExit",
    "exitLevel",
  ]);
}

function getPriceMoveResult(trade: Trade) {
  const direction = getDirection(trade);
  const entry = getEntryPrice(trade);
  const exit = getExitPrice(trade);

  if (!entry || !exit || !direction) return 0;

  const isLong =
    direction.includes("long") ||
    direction.includes("buy") ||
    direction.includes("bull");

  const isShort =
    direction.includes("short") ||
    direction.includes("sell") ||
    direction.includes("bear");

  if (isLong) return exit - entry;
  if (isShort) return entry - exit;

  return 0;
}

function getResultText(trade: Trade) {
  const t = trade as any;

  const directValues = [
    t.result,
    t.outcome,
    t.tradeResult,
    t.closeResult,
    t.reviewResult,
    t.pnlResult,
    t.winLoss,
    t.resultType,
  ];

  // Also scan unknown old fields that contain result/outcome/win/loss
  const scannedValues = Object.entries(t)
    .filter(([key]) => {
      const k = clean(key);
      return (
        k.includes("result") ||
        k.includes("outcome") ||
        k.includes("winloss") ||
        k === "win" ||
        k === "loss" ||
        k === "winner" ||
        k === "loser"
      );
    })
    .map(([, value]) => value);

  const statusText = clean(t.status);

  const values = [...directValues, ...scannedValues]
    .map(clean)
    .filter(Boolean);

  // Use status only if it actually says win/loss, not just "Closed".
  if (
    statusText.includes("win") ||
    statusText.includes("loss") ||
    statusText.includes("tp") ||
    statusText.includes("sl") ||
    statusText.includes("profit") ||
    statusText.includes("red") ||
    statusText.includes("green")
  ) {
    values.push(statusText);
  }

  return values.join(" ");
}

function getBooleanOutcome(trade: Trade): "win" | "loss" | "unknown" {
  const t = trade as any;

  const winFields = ["isWin", "winner", "won", "win"];
  const lossFields = ["isLoss", "loser", "lost", "loss"];

  for (const field of winFields) {
    if (t[field] === true) return "win";
    if (clean(t[field]) === "true") return "win";
  }

  for (const field of lossFields) {
    if (t[field] === true) return "loss";
    if (clean(t[field]) === "true") return "loss";
  }

  return "unknown";
}

function getTradeOutcome(
  trade: Trade
): "win" | "loss" | "breakeven" | "unknown" {
  const resultText = getResultText(trade);

  // Explicit result text first.
  if (
    resultText.includes("win") ||
    resultText.includes("won") ||
    resultText.includes("winner") ||
    resultText.includes("tp") ||
    resultText.includes("target hit") ||
    resultText.includes("take profit") ||
    resultText.includes("profit") ||
    resultText.includes("green")
  ) {
    return "win";
  }

  if (
    resultText.includes("loss") ||
    resultText.includes("lost") ||
    resultText.includes("loser") ||
    resultText.includes("sl") ||
    resultText.includes("stop") ||
    resultText.includes("stop loss") ||
    resultText.includes("red")
  ) {
    return "loss";
  }

  if (
    resultText === "be" ||
    resultText.includes("break even") ||
    resultText.includes("breakeven") ||
    resultText.includes("scratch") ||
    resultText.includes("flat")
  ) {
    return "breakeven";
  }

  const booleanOutcome = getBooleanOutcome(trade);
  if (booleanOutcome !== "unknown") return booleanOutcome;

  // Money P&L.
  const pnl = getTradePnl(trade);
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";

  // Price movement fallback using direction + entry + exit.
  const priceMove = getPriceMoveResult(trade);
  if (priceMove > 0) return "win";
  if (priceMove < 0) return "loss";

  // Actual R fallback.
  const strongR = getStrongActualR(trade);
  const weakR = getWeakR(trade);

  if (strongR > 0) return "win";
  if (strongR < 0) return "loss";

  if (weakR > 0) return "win";
  if (weakR < 0) return "loss";

  return "unknown";
}

function getTradeResultR(trade: Trade) {
  const outcome = getTradeOutcome(trade);

  const strongR = getStrongActualR(trade);
  const weakR = getWeakR(trade);
  const plannedRR = getPlannedRR(trade);
  const pnl = getTradePnl(trade);
  const priceMove = getPriceMoveResult(trade);

  // Actual R field exists.
  if (strongR !== 0) return strongR;

  // Old "r" field.
  if (weakR !== 0) {
    if (outcome === "win") return Math.abs(weakR);
    if (outcome === "loss") return -Math.abs(weakR);
    return weakR;
  }

  // Planned RR exists.
  if (plannedRR !== 0) {
    if (outcome === "win") return Math.abs(plannedRR);
    if (outcome === "loss") return -1;
    if (outcome === "breakeven") return 0;
  }

  // P&L exists but no R.
  if (pnl > 0) return 1;
  if (pnl < 0) return -1;

  // Entry/exit exists but no R.
  if (priceMove > 0) return 1;
  if (priceMove < 0) return -1;

  if (outcome === "win") return 1;
  if (outcome === "loss") return -1;

  return 0;
}

function tradeStrategyValues(trade: Trade) {
  const t = trade as any;

  const rawValues = [
    t.strategy,
    t.setup,
    t.setupName,
    t.playbook,
    t.playbookName,
    t.strategyName,
    t.model,
    t.edge,
  ];

  const values = rawValues.map(clean).filter(Boolean);

  if (Array.isArray(t.tags)) {
    values.push(...t.tags.map(clean).filter(Boolean));
  }

  if (typeof t.tags === "string") {
    values.push(
      ...t.tags
        .split(",")
        .map(clean)
        .filter(Boolean)
    );
  }

  return values;
}

function strategyMatchesTrade(setup: PlaybookSetup, trade: Trade) {
  const t = trade as any;

  const setupName = clean(setup.name);
  const setupId = clean(setup.id);

  const directIds = [
    clean(t.playbookSetupId),
    clean(t.setupId),
    clean(t.strategyId),
  ].filter(Boolean);

  if (setupId && directIds.includes(setupId)) return true;

  const values = tradeStrategyValues(trade);

  if (setupName && values.includes(setupName)) return true;

  if (
    setupName.length >= 4 &&
    values.some((value) => value.length >= 4 && value.includes(setupName))
  ) {
    return true;
  }

  return false;
}

function calcSetupStats(setup: PlaybookSetup, trades: Trade[]): SetupStats {
  const relatedTrades = trades.filter((trade) =>
    strategyMatchesTrade(setup, trade)
  );

  const outcomes = relatedTrades.map((trade) => ({
    trade,
    outcome: getTradeOutcome(trade),
    r: getTradeResultR(trade),
  }));

  const wins = outcomes.filter((item) => item.outcome === "win");
  const losses = outcomes.filter((item) => item.outcome === "loss");
  const breakeven = outcomes.filter((item) => item.outcome === "breakeven");

  const totalR = outcomes.reduce((sum, item) => sum + item.r, 0);

  const winRValues = wins.map((item) => item.r).filter((value) => value > 0);
  const lossRValues = losses.map((item) => item.r).filter((value) => value < 0);

  const avgWinR = winRValues.length
    ? winRValues.reduce((sum, value) => sum + value, 0) / winRValues.length
    : 0;

  const avgLossR = lossRValues.length
    ? lossRValues.reduce((sum, value) => sum + value, 0) / lossRValues.length
    : 0;

  const grossWinR = winRValues.reduce((sum, value) => sum + value, 0);
  const grossLossR = Math.abs(
    lossRValues.reduce((sum, value) => sum + value, 0)
  );

  const profitFactor =
    grossLossR > 0 ? grossWinR / grossLossR : grossWinR > 0 ? grossWinR : 0;

  return {
    trades: relatedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    totalR,
    winRate: relatedTrades.length ? (wins.length / relatedTrades.length) * 100 : 0,
    expectancy: relatedTrades.length ? totalR / relatedTrades.length : 0,
    avgWinR,
    avgLossR,
    profitFactor,
  };
}

function formatR(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function statusClass(status?: string) {
  const value = clean(status);

  if (value === "active") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (value === "testing") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  if (value === "archived") {
    return "border-zinc-400/20 bg-zinc-400/10 text-zinc-300";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

function edgeGrade(stats: SetupStats) {
  if (stats.trades < 5) return "Building";
  if (stats.expectancy >= 0.75 && stats.profitFactor >= 1.7) return "A+ Edge";
  if (stats.expectancy >= 0.4 && stats.profitFactor >= 1.3) return "A Edge";
  if (stats.expectancy > 0) return "Positive";
  if (stats.expectancy === 0) return "Neutral";
  return "Leak";
}

function edgeGradeClass(stats: SetupStats) {
  const grade = edgeGrade(stats);

  if (grade === "A+ Edge" || grade === "A Edge") return "text-emerald-300";
  if (grade === "Positive") return "text-lime-300";
  if (grade === "Leak") return "text-red-300";
  if (grade === "Building") return "text-amber-300";

  return "text-zinc-300";
}

function progressWidth(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.max(0, Math.min(100, value))}%`;
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#12101c] p-5 shadow-lg shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-semibold leading-tight text-white">
            {value}
          </p>

          <p className="mt-2 truncate text-xs leading-5 text-zinc-500">
            {sub}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "gold";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
      ? "text-red-300"
      : tone === "gold"
      ? "text-amber-300"
      : "text-white";

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>

      <p className={`mt-2 truncate text-xl font-semibold leading-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function TextPanel({
  icon,
  title,
  children,
  empty,
}: {
  icon: ReactNode;
  title: string;
  children?: string;
  empty: string;
}) {
  const text = String(children || "").trim();

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
        {icon}
        <span>{title}</span>
      </div>

      <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
        {text || empty}
      </p>
    </div>
  );
}

function SetupCard({
  setup,
  stats,
  onEdit,
  onDelete,
}: {
  setup: PlaybookSetup;
  stats: SetupStats;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rules = setup.rules || [];
  const mistakes = setup.mistakesToAvoid || [];
  const tags = setup.tags || [];

  const winWidth = stats.trades ? (stats.wins / stats.trades) * 100 : 0;
  const lossWidth = stats.trades ? (stats.losses / stats.trades) * 100 : 0;
  const beWidth = stats.trades ? (stats.breakeven / stats.trades) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0d0b16] shadow-xl shadow-black/20 transition hover:border-amber-400/30">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-transparent" />

      <div className="grid gap-0 xl:grid-cols-[360px_1fr]">
        {/* LEFT PANEL */}
        <div className="border-b border-white/10 bg-white/[0.025] p-5 xl:border-b-0 xl:border-r">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                    setup.status
                  )}`}
                >
                  {setup.status || "Active"}
                </span>

                <span
                  className={`rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-semibold ${edgeGradeClass(
                    stats
                  )}`}
                >
                  {edgeGrade(stats)}
                </span>
              </div>

              <h3 className="mt-4 break-words text-2xl font-semibold tracking-tight text-white">
                {setup.name}
              </h3>

              <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                {setup.description || "No setup thesis added yet."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {setup.market && (
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-400">
                {setup.market}
              </span>
            )}

            {setup.timeframe && (
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-400">
                {setup.timeframe}
              </span>
            )}

            {setup.directionBias && (
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-zinc-400">
                {setup.directionBias}
              </span>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Trade Distribution
              </p>
              <p className="text-xs text-zinc-400">
  {stats.wins + stats.losses + stats.breakeven}/{stats.trades} classified
</p>
            </div>

            <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="bg-emerald-400"
                style={{ width: progressWidth(winWidth) }}
              />
              <div
                className="bg-zinc-500"
                style={{ width: progressWidth(beWidth) }}
              />
              <div
                className="bg-red-400"
                style={{ width: progressWidth(lossWidth) }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-emerald-400/10 px-2 py-2 text-emerald-300">
                {stats.wins}W
              </div>
              <div className="rounded-xl bg-white/5 px-2 py-2 text-zinc-300">
                {stats.breakeven}BE
              </div>
              <div className="rounded-xl bg-red-400/10 px-2 py-2 text-red-300">
                {stats.losses}L
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={onEdit}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/7 hover:text-white"
            >
              <Pencil size={15} />
              Edit
            </button>

            <button
              onClick={onDelete}
              className="inline-flex items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.03] px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/10"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="min-w-0 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat
              label="Total R"
              value={formatR(stats.totalR)}
              tone={stats.totalR >= 0 ? "good" : "bad"}
            />

            <MiniStat
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              tone={stats.winRate >= 50 ? "good" : "neutral"}
            />

            <MiniStat label="Trades" value={String(stats.trades)} />

            <MiniStat
              label="Expectancy"
              value={formatR(stats.expectancy)}
              tone={stats.expectancy >= 0 ? "good" : "bad"}
            />

            <MiniStat
              label="Profit Factor"
              value={formatNumber(stats.profitFactor)}
              tone={stats.profitFactor >= 1.3 ? "good" : "gold"}
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <TextPanel
              title="Entry Model"
              icon={<Crosshair size={15} className="text-amber-300" />}
              empty="Add your exact trigger, confirmation, and entry location."
            >
              {setup.entryModel}
            </TextPanel>

            <TextPanel
              title="Risk Protocol"
              icon={<ShieldCheck size={15} className="text-emerald-300" />}
              empty="Add max risk, stop placement, daily loss rule, and no-trade conditions."
            >
              {setup.riskRule}
            </TextPanel>

            <TextPanel
              title="Invalidation"
              icon={<CircleAlert size={15} className="text-red-300" />}
              empty="Add what proves the setup is wrong."
            >
              {setup.invalidation}
            </TextPanel>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.85fr]">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-white">
                    Execution Checklist
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pre-entry rules for this setup.
                  </p>
                </div>

                <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
              </div>

              {rules.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {rules.slice(0, 8).map((rule, index) => (
                    <div
                      key={`${rule}-${index}`}
                      className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2"
                    >
                      <div className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        <p className="whitespace-pre-wrap break-words text-sm leading-5 text-zinc-300">
                          {rule}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-zinc-500">
                  No checklist added. Add rules like HTF aligned, minimum 2R,
                  no news, entry at planned zone, and risk set before entry.
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-4">
              <div className="mb-3 flex items-center gap-2">
                <CircleAlert size={16} className="text-red-300" />
                <h4 className="font-semibold text-white">Avoid These Leaks</h4>
              </div>

              {mistakes.length > 0 ? (
                <div className="space-y-2">
                  {mistakes.slice(0, 5).map((mistake, index) => (
                    <div
                      key={`${mistake}-${index}`}
                      className="rounded-xl bg-black/20 px-3 py-2"
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-5 text-zinc-300">
                        {mistake}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-500">
                  Add common mistakes like chasing entries, moving stops, taking
                  late signals, or trading during news.
                </p>
              )}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaybookSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-80 animate-pulse rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function EmptyPlaybook({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.13),transparent_45%)]" />

        <div className="relative flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/10 text-amber-300">
            <BookOpen size={30} />
          </div>

          <h2 className="text-2xl font-semibold text-white">
            Build your first strategy model
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Define your setup, rules, invalidation, and risk protocol. Then tag
            trades with the same strategy name to measure real edge.
          </p>

          <button
            onClick={onCreate}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            <Plus size={17} />
            Create First Setup
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function PlaybookPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [setups, setSetups] = useState<PlaybookSetup[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState<PlaybookSetup | null>(null);

  async function loadData() {
    if (!user) return;

    setLoading(true);

    try {
      const [playbookData, tradeData] = await Promise.all([
        getPlaybook(user.id),
        getTrades(user.id),
      ]);

      setSetups(playbookData as PlaybookSetup[]);
      setTrades(tradeData as Trade[]);

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const setupStats = useMemo(() => {
    const map = new Map<string, SetupStats>();

    for (const setup of setups) {
      map.set(setup.id, calcSetupStats(setup, trades));
    }

    return map;
  }, [setups, trades]);

  const filteredSetups = useMemo(() => {
    const query = clean(search);

    return setups.filter((setup) => {
      const statusOk =
        statusFilter === "all" || clean(setup.status) === statusFilter;

      const haystack = [
        setup.name,
        setup.status,
        setup.market,
        setup.timeframe,
        setup.directionBias,
        setup.description,
        setup.entryModel,
        setup.invalidation,
        setup.targetModel,
        setup.riskRule,
        ...(setup.rules || []),
        ...(setup.mistakesToAvoid || []),
        ...(setup.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      const searchOk = !query || haystack.includes(query);

      return statusOk && searchOk;
    });
  }, [setups, search, statusFilter]);

  const globalStats = useMemo(() => {
    const active = setups.filter((setup) => clean(setup.status) === "active")
      .length;

    let bestSetup: PlaybookSetup | null = null;
    let bestStats: SetupStats | null = null;

    for (const setup of setups) {
      const stats = setupStats.get(setup.id) || calcSetupStats(setup, trades);

      if (!bestStats || stats.expectancy > bestStats.expectancy) {
        bestSetup = setup;
        bestStats = stats;
      }
    }

    const totalStrategyTrades = setups.reduce((sum, setup) => {
      const stats = setupStats.get(setup.id);
      return sum + (stats?.trades || 0);
    }, 0);

    const totalR = setups.reduce((sum, setup) => {
      const stats = setupStats.get(setup.id);
      return sum + (stats?.totalR || 0);
    }, 0);

    return {
      active,
      bestSetup,
      bestStats,
      totalStrategyTrades,
      totalR,
    };
  }, [setups, trades, setupStats]);

  function openCreate() {
    setEditingSetup(null);
    setModalOpen(true);
  }

  function openEdit(setup: PlaybookSetup) {
    setEditingSetup(setup);
    setModalOpen(true);
  }

  async function handleSave(setup: Partial<PlaybookSetup>) {
    if (!user) return;

    await savePlaybookSetup(user.id, setup as PlaybookSetup);

    setModalOpen(false);
    setEditingSetup(null);

    await loadData();
  }

  async function handleDelete(setup: PlaybookSetup) {
    if (!user) return;

    const confirmed = confirm(
      `Delete "${setup.name}" from your playbook? This will not delete trades.`
    );

    if (!confirmed) return;

    await deletePlaybookSetup(user.id, setup.id);
    await loadData();
  }

  return (
    <ProtectedRoute>
      <AppShell title="Playbook">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0b16] p-6 shadow-2xl shadow-black/30 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_35%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                  <Radar size={14} />
                  Strategy Edge Desk
                </div>

                <h1 className="break-words text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Playbook
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400 md:text-base">
                  Build repeatable setups, connect them to your trade log, and
                  measure which strategies deserve more size.
                </p>
              </div>

              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                <Plus size={17} />
                New Setup
              </button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Layers3 size={20} />}
              label="Total Models"
              value={String(setups.length)}
              sub="Strategies in your playbook"
            />

            <MetricCard
              icon={<Flame size={20} />}
              label="Active Models"
              value={String(globalStats.active)}
              sub="Approved for live execution"
            />

            <MetricCard
              icon={<TrendingUp size={20} />}
              label="Strategy R"
              value={formatR(globalStats.totalR)}
              sub={`${globalStats.totalStrategyTrades} matched trades`}
            />

            <MetricCard
              icon={<Target size={20} />}
              label="Best Edge"
              value={globalStats.bestSetup?.name || "No data"}
              sub={
                globalStats.bestStats
                  ? `${formatR(globalStats.bestStats.expectancy)} expectancy`
                  : "Tag trades with strategy name"
              }
            />
          </section>

          <Card className="border-white/10 bg-white/[0.03]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-amber-300" />
                  <h2 className="text-lg font-semibold text-white">
                    Strategy Library
                  </h2>
                </div>

                <p className="mt-1 text-sm text-zinc-400">
                  Performance is matched from Trade Log strategy/setup/tags.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search strategies..."
                    className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50 sm:w-72"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50 sm:w-44"
                  >
                    <option value="all" className="bg-zinc-950">
                      All Status
                    </option>
                    <option value="active" className="bg-zinc-950">
                      Active
                    </option>
                    <option value="testing" className="bg-zinc-950">
                      Testing
                    </option>
                    <option value="archived" className="bg-zinc-950">
                      Archived
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {loading ? (
            <PlaybookSkeleton />
          ) : setups.length === 0 ? (
            <EmptyPlaybook onCreate={openCreate} />
          ) : filteredSetups.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <p className="text-lg font-semibold text-white">
                  No strategies match your filters.
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Try clearing search or changing the status filter.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSetups.map((setup) => {
                const stats =
                  setupStats.get(setup.id) || calcSetupStats(setup, trades);

                return (
                  <SetupCard
                    key={setup.id}
                    setup={setup}
                    stats={stats}
                    onEdit={() => openEdit(setup)}
                    onDelete={() => handleDelete(setup)}
                  />
                );
              })}
            </div>
          )}
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingSetup(null);
          }}
          title={editingSetup ? "Edit Strategy Model" : "New Strategy Model"}
        >
          <PlaybookForm
            existing={editingSetup}
            onCancel={() => {
              setModalOpen(false);
              setEditingSetup(null);
            }}
            onSave={handleSave}
          />
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}