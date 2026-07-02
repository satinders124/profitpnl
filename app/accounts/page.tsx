"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/providers/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { AccountForm } from "@/components/accounts/AccountForm";
import { deleteAccount, getAccounts, getTrades } from "@/lib/firestore";
import { TradingAccount } from "@/types/account";
import { Trade } from "@/types/trade";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Filter,
  Gauge,
  Layers3,
  LineChart as LineChartIcon,
  Search,
  Target,
  TrendingUp,
  Trophy,
  Plus,
  Wallet,
  CreditCard,
} from "lucide-react";

// ... (Keeping your helper functions: num, clean, pretty, getFirstNumber, etc. from your original code)
// I'll omit the helpers here for brevity but KEEP THEM in your file!
// Make sure all those helper functions (num, clean, pretty, getTradePnl, etc.) stay in the file.

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "").replace(/r/gi, "").replace(/[^\d.-]/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function clean(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function pretty(value: unknown, fallback = "Unknown") {
  const text = String(value || "").trim();
  return text || fallback;
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
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function getTradePnl(trade: Trade) {
  const t = trade as any;
  const pnl = getFirstNumber(t, ["pnl", "pnlAmount", "pnlValue", "profitLoss", "profit_loss", "netPnl", "netPNL", "netProfit", "realizedPnl", "realisedPnl", "realizedProfit", "realisedProfit", "resultAmount", "amount", "pl", "p_l"]);
  if (pnl !== 0) return pnl;
  const profit = getFirstNumber(t, ["profit", "profitAmount", "gain"]);
  if (profit !== 0) return Math.abs(profit);
  const loss = getFirstNumber(t, ["loss", "lossAmount"]);
  if (loss !== 0) return -Math.abs(loss);
  return 0;
}

function getActualR(trade: Trade) {
  const t = trade as any;
  return getFirstNumber(t, ["result", "rMultiple", "r_multiple", "resultR", "netR", "realizedR", "realisedR", "actualR", "tradeR", "outcomeR"]);
}

function getPlannedRR(trade: Trade) {
  const t = trade as any;
  return getFirstNumber(t, ["rr", "riskReward", "riskRewardRatio", "plannedR", "plannedRR", "rewardRisk"]);
}

function getDirection(trade: Trade) {
  const t = trade as any;
  return pretty(getFieldValue(t, ["direction", "side", "type", "position", "tradeType", "bias"]), "Unknown");
}

function getEntryPrice(trade: Trade) {
  const t = trade as any;
  return getFirstNumber(t, ["entry", "entryPrice", "entry_price", "openPrice", "avgEntry", "averageEntry", "entryLevel"]);
}

function getExitPrice(trade: Trade) {
  const t = trade as any;
  return getFirstNumber(t, ["exit", "exitPrice", "exit_price", "closePrice", "avgExit", "averageExit", "exitLevel"]);
}

function getPriceMoveResult(trade: Trade) {
  const direction = clean(getDirection(trade));
  const entry = getEntryPrice(trade);
  const exit = getExitPrice(trade);
  if (!entry || !exit || !direction) return 0;
  const isLong = direction.includes("long") || direction.includes("buy") || direction.includes("bull");
  const isShort = direction.includes("short") || direction.includes("sell") || direction.includes("bear");
  if (isLong) return exit - entry;
  if (isShort) return entry - exit;
  return 0;
}

function getResultText(trade: Trade) {
  const t = trade as any;
  const directValues = [t.outcome, t.tradeResult, t.closeResult, t.reviewResult, t.pnlResult, t.winLoss, t.resultType];
  const scannedValues = Object.entries(t).filter(([key]) => {
    const k = clean(key);
    return (k.includes("outcome") || k.includes("winloss") || k === "win" || k === "loss" || k === "winner" || k === "loser");
  }).map(([, value]) => value);
  const statusText = clean(t.status);
  const values = [...directValues, ...scannedValues].map(clean).filter(Boolean);
  if (statusText.includes("win") || statusText.includes("loss") || statusText.includes("tp") || statusText.includes("sl") || statusText.includes("profit") || statusText.includes("red") || statusText.includes("green")) {
    values.push(statusText);
  }
  return values.join(" ");
}

function getTradeOutcome(trade: Trade) {
  const actualR = getActualR(trade);
  if (actualR > 0) return "win";
  if (actualR < 0) return "loss";
  const resultText = getResultText(trade);
  if (resultText.includes("win") || resultText.includes("won") || resultText.includes("winner") || resultText.includes("tp") || resultText.includes("target hit") || resultText.includes("take profit") || resultText.includes("profit") || resultText.includes("green")) return "win";
  if (resultText.includes("loss") || resultText.includes("lost") || resultText.includes("loser") || resultText.includes("sl") || resultText.includes("stop") || resultText.includes("stop loss") || resultText.includes("red")) return "loss";
  if (resultText === "be" || resultText.includes("break even") || resultText.includes("breakeven") || resultText.includes("scratch") || resultText.includes("flat")) return "breakeven";
  const pnl = getTradePnl(trade);
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  const priceMove = getPriceMoveResult(trade);
  if (priceMove > 0) return "win";
  if (priceMove < 0) return "loss";
  return "unknown";
}

function getTradeResultR(trade: Trade) {
  const outcome = getTradeOutcome(trade);
  const actualR = getActualR(trade);
  const plannedRR = getPlannedRR(trade);
  const pnl = getTradePnl(trade);
  const priceMove = getPriceMoveResult(trade);
  if (actualR !== 0) return actualR;
  if (plannedRR !== 0) {
    if (outcome === "win") return Math.abs(plannedRR);
    if (outcome === "loss") return -1;
    if (outcome === "breakeven") return 0;
  }
  if (pnl > 0) return 1;
  if (pnl < 0) return -1;
  if (priceMove > 0) return 1;
  if (priceMove < 0) return -1;
  if (outcome === "win") return 1;
  if (outcome === "loss") return -1;
  return 0;
}

function parseDateValue(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value?.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return !Number.isNaN(date.getTime()) ? date : null;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) ? date : null;
}

function getTradeDate(trade: Trade) {
  const t = trade as any;
  const value = getFieldValue(t, ["date", "tradeDate", "entryDate", "openDate", "closeDate", "createdAt", "updatedAt"]);
  return parseDateValue(value);
}

function getStrategy(trade: Trade) {
  const t = trade as any;
  return pretty(getFieldValue(t, ["setup", "strategy", "setupName", "playbook", "playbookName", "strategyName", "model", "edge"]), "No Strategy");
}

function getInstrument(trade: Trade) {
  const t = trade as any;
  return pretty(getFieldValue(t, ["instrument", "symbol", "ticker", "pair"]), "Unknown");
}

function getAccountName(trade: Trade, accounts: TradingAccount[]) {
  const t = trade as any;
  const rawAccount = getFieldValue(t, ["account", "accountName", "accountLabel", "broker", "accountId"]);
  if (!rawAccount) return "No Account";
  const match = accounts.find((account) => clean(account.id) === clean(rawAccount) || clean(account.name) === clean(rawAccount));
  return match?.name || String(rawAccount);
}

function enhanceTrade(trade: Trade, accounts: TradingAccount[]): any {
  const outcome = getTradeOutcome(trade);
  const r = getTradeResultR(trade);
  return {
    ...trade,
    _r: r,
    _pnl: getTradePnl(trade),
    _outcome: outcome,
    _date: getTradeDate(trade),
    _strategy: getStrategy(trade),
    _account: getAccountName(trade, accounts),
    _instrument: getInstrument(trade),
    _direction: getDirection(trade),
  };
}

function formatR(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

// --- MAIN COMPONENT ---

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TradingAccount | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const [accountRows, tradeRows] = await Promise.all([
        getAccounts(user.uid),
        getTrades(user.uid),
      ]);
      setAccounts(accountRows);
      setTrades(tradeRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  function openNew() {
    console.log("DEBUG: openNew called");
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(account: TradingAccount) {
    console.log("DEBUG: openEdit called for", account.id);
    setEditing(account);
    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this account?")) return;
    await deleteAccount(user.uid, id);
    await load();
  }

  const totals = useMemo(() => {
    const totalSize = accounts.reduce((sum, a) => sum + Number(a.size || 0), 0);
    const totalR = trades.reduce((sum, trade) => {
      const r = Number(trade.result);
      return Number.isFinite(r) ? sum + r : sum;
    }, 0);
    const actualPnl = trades.reduce((sum, trade) => {
      const p = Number(trade.pnl);
      return Number.isFinite(p) ? sum + p : sum;
    }, 0);
    return {
      totalSize,
      totalR,
      actualPnl,
      activeAccounts: accounts.filter((a) => (a.status || "Active") === "Active").length,
    };
  }, [accounts, trades]);

  return (
    <AppShell
      title="Accounts"
      subtitle="Prop firm and personal account tracking"
      actionLabel="Add Account"
      onAction={openNew}
    >
      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center text-sm text-[#5A5A80]">
          Loading accounts…
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats Section */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TopStat icon={<Wallet size={18} />} label="Total Capital" value={`$${totals.totalSize.toLocaleString()}`} sub={`${accounts.length} accounts`} color="#F0B429" />
            <TopStat icon={<CreditCard size={18} />} label="Active Accounts" value={String(totals.activeAccounts)} sub="currently trading" color="#4C82FB" />
            <TopStat icon={<TrendingUp size={18} />} label="Total R" value={formatR(totals.totalR)} sub="all account trades" color={totals.totalR >= 0 ? "#00D084" : "#FF4565"} />
            <TopStat icon={<Target size={18} />} label="Actual P&L" value={`${totals.actualPnl >= 0 ? "+" : "-"}$${Math.abs(totals.actualPnl).toFixed(2)}`} sub="entered trade P&L" color={totals.actualPnl >= 0 ? "#00D084" : "#FF4565"} />
          </section>

          {/* Accounts Grid */}
          {accounts.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {accounts.map((account) => {
                const accountTrades = trades.filter((trade) => trade.account === account.name);
                return (
                  <AccountCard
                    key={account.id}
                    account={account}
                    trades={accountTrades}
                    onEdit={() => openEdit(account)}
                    onDelete={() => handleDelete(account.id)}
                  />
                );
              })}
            </section>
          ) : (
            <Card className="p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D0D1A] text-[#F0B429]">
                <CreditCard size={28} />
              </div>
              <h2 className="mt-5 text-xl font-black">No accounts yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A0A0C0]">
                Add your prop firm or personal account to track performance separately.
              </p>
              <button onClick={openNew} className="gold-gradient mt-6 rounded-xl px-5 py-3 text-sm font-black text-[#080810]">
                Add First Account
              </button>
            </Card>
          )}
        </div>
      )}

      {formOpen && user && (
        <Modal title={editing ? "Edit Account" : "Add Account"} onClose={() => setFormOpen(false)}>
          <AccountForm
            uid={user.uid}
            existing={editing}
            onCancel={() => setFormOpen(false)}
            onSaved={async () => {
              setFormOpen(false);
              await load();
            }}
          />
        </Modal>
      )}
    </AppShell>
  );
}

// --- UI SUB-COMPONENTS ---

function TopStat({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</div>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em]" style={{ color }}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-[#5A5A80]">{sub}</div>
    </Card>
  );
}

function AccountCard({ account, trades, onEdit, onDelete }: { account: TradingAccount; trades: Trade[]; onEdit: () => void; onDelete: () => void }) {
  const totalR = trades.reduce((sum, trade) => {
    const r = Number(trade.result);
    return Number.isFinite(r) ? sum + r : sum;
  }, 0);
  const actualPnl = trades.reduce((sum, trade) => {
    const p = Number(trade.pnl);
    return Number.isFinite(p) ? sum + p : sum;
  }, 0);
  const size = Number(account.size || 0);
  const estimatedPnl = actualPnl || totalR * (size * 0.01 || 100);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[#1E1E38] bg-gradient-to-br from-[#161628] to-[#111120] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-[-0.04em]">{account.name}</h2>
              <span className="rounded-full border border-[#F0B429]/20 bg-[#F0B429]/10 px-2 py-0.5 text-[10px] font-black text-[#F0B429]">
                {account.type || "Account"}
              </span>
            </div>
            <div className="mt-1 text-sm text-[#5A5A80]">{account.firm || "No firm"} · {account.status || "Active"}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-black text-[#A0A0C0] hover:bg-[#1E1E38]/50 transition-colors">
              Edit
            </button>
            <button onClick={onDelete} className="rounded-xl border border-[#FF4565]/20 bg-[#FF4565]/10 px-3 py-2 text-xs font-black text-[#FF4565] hover:bg-[#FF4565]/20 transition-colors">
              Delete
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AccountMetric label="Size" value={size ? `$${size.toLocaleString()}` : "—"} />
          <AccountMetric label="Total R" value={formatR(totalR)} color={totalR >= 0 ? "#00D084" : "#FF4565"} />
          <AccountMetric label="Est. P&L" value={`${estimatedPnl >= 0 ? "+" : "-"}$${Math.abs(estimatedPnl).toFixed(0)}`} color={estimatedPnl >= 0 ? "#00D084" : "#FF4565"} />
          <AccountMetric label="Trades" value={String(trades.length)} />
        </div>
      </div>
      <div className="p-5">
         {account.notes && (
           <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4 text-sm leading-6 text-[#A0A0C0]">
             {account.notes}
           </div>
         )}
      </div>
    </Card>
  );
}

function AccountMetric({ label, value, color = "#F0F0FF" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#5A5A80]">{label}</div>
      <div className="mt-1 text-sm font-black" style={{ color }}>{value}</div>
    </div>
  );
}

