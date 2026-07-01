"use client";

import { AccountForm } from "@/components/accounts/AccountForm";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import  Modal  from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  deleteAccount,
  getAccounts,
  getTrades,
} from "@/lib/firestore";
import { formatR } from "@/lib/stats";
import { TradingAccount } from "@/types/account";
import { Trade } from "@/types/trade";
import {
  AlertTriangle,
  CreditCard,
  Shield,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(account: TradingAccount) {
    setEditing(account);
    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    if (!user) return;

    if (!confirm("Delete this account? Trades will remain, but account tracking will be removed.")) {
      return;
    }

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
      activeAccounts: accounts.filter((a) => (a.status || "Active") === "Active")
        .length,
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
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TopStat
              icon={<Wallet size={18} />}
              label="Total Capital"
              value={`$${totals.totalSize.toLocaleString()}`}
              sub={`${accounts.length} accounts`}
              color="#F0B429"
            />
            <TopStat
              icon={<CreditCard size={18} />}
              label="Active Accounts"
              value={String(totals.activeAccounts)}
              sub="currently trading"
              color="#4C82FB"
            />
            <TopStat
              icon={<TrendingUp size={18} />}
              label="Total R"
              value={formatR(totals.totalR)}
              sub="all account trades"
              color={totals.totalR >= 0 ? "#00D084" : "#FF4565"}
            />
            <TopStat
              icon={<Target size={18} />}
              label="Actual P&L"
              value={`${totals.actualPnl >= 0 ? "+" : "-"}$${Math.abs(
                totals.actualPnl
              ).toFixed(2)}`}
              sub="entered trade P&L"
              color={totals.actualPnl >= 0 ? "#00D084" : "#FF4565"}
            />
          </section>

          {accounts.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {accounts.map((account) => {
                const accountTrades = trades.filter(
                  (trade) => trade.account === account.name
                );

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
                Add your prop firm, funded, evaluation, personal, or demo
                account to track risk, drawdown and performance separately.
              </p>

              <button
                onClick={openNew}
                className="gold-gradient mt-6 rounded-xl px-5 py-3 text-sm font-black text-[#080810]"
              >
                Add First Account
              </button>
            </Card>
          )}
        </div>
      )}

      {formOpen && user && (
        <Modal
          title={editing ? "Edit Account" : "Add Account"}
          onClose={() => setFormOpen(false)}
        >
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

function TopStat({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
          {label}
        </div>
        <div style={{ color }}>{icon}</div>
      </div>

      <div className="mt-3 text-3xl font-black tracking-[-0.06em]" style={{ color }}>
        {value}
      </div>

      <div className="mt-1 text-xs font-semibold text-[#5A5A80]">{sub}</div>
    </Card>
  );
}

function AccountCard({
  account,
  trades,
  onEdit,
  onDelete,
}: {
  account: TradingAccount;
  trades: Trade[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalR = trades.reduce((sum, trade) => {
    const r = Number(trade.result);
    return Number.isFinite(r) ? sum + r : sum;
  }, 0);

  const actualPnl = trades.reduce((sum, trade) => {
    const p = Number(trade.pnl);
    return Number.isFinite(p) ? sum + p : sum;
  }, 0);

  const size = Number(account.size || 0);
  const maxDDPct = Number(account.maxDD || 0);
  const dailyLossPct = Number(account.dailyLoss || 0);
  const targetPct = Number(account.profitTarget || 0);

  const estimatedPnl = actualPnl || totalR * (size * 0.01 || 100);

  const ddLimit = size && maxDDPct ? size * (maxDDPct / 100) : 0;
  const targetAmount = size && targetPct ? size * (targetPct / 100) : 0;
  const dailyLossAmount = size && dailyLossPct ? size * (dailyLossPct / 100) : 0;

  const targetProgress = targetAmount
    ? Math.max(0, Math.min(100, (estimatedPnl / targetAmount) * 100))
    : 0;

  const ddUsed = ddLimit && estimatedPnl < 0
    ? Math.max(0, Math.min(100, (Math.abs(estimatedPnl) / ddLimit) * 100))
    : 0;

  const riskStatus =
    ddUsed >= 80 ? "Danger" : ddUsed >= 50 ? "Warning" : "Healthy";

  const riskColor =
    riskStatus === "Danger"
      ? "#FF4565"
      : riskStatus === "Warning"
        ? "#F0B429"
        : "#00D084";

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[#1E1E38] bg-gradient-to-br from-[#161628] to-[#111120] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-[-0.04em]">
                {account.name}
              </h2>

              <span className="rounded-full border border-[#F0B429]/20 bg-[#F0B429]/10 px-2 py-0.5 text-[10px] font-black text-[#F0B429]">
                {account.type || "Account"}
              </span>

              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-black"
                style={{
                  color: riskColor,
                  borderColor: `${riskColor}33`,
                  background: `${riskColor}15`,
                }}
              >
                {riskStatus}
              </span>
            </div>

            <div className="mt-1 text-sm text-[#5A5A80]">
              {account.firm || "No firm"} · {account.status || "Active"}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-black text-[#A0A0C0]"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-xl border border-[#FF4565]/20 bg-[#FF4565]/10 px-3 py-2 text-xs font-black text-[#FF4565]"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AccountMetric
            label="Size"
            value={size ? `$${size.toLocaleString()}` : "—"}
          />
          <AccountMetric
            label="Total R"
            value={formatR(totalR)}
            color={totalR >= 0 ? "#00D084" : "#FF4565"}
          />
          <AccountMetric
            label="Est. P&L"
            value={`${estimatedPnl >= 0 ? "+" : "-"}$${Math.abs(
              estimatedPnl
            ).toFixed(0)}`}
            color={estimatedPnl >= 0 ? "#00D084" : "#FF4565"}
          />
          <AccountMetric label="Trades" value={String(trades.length)} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <ProgressRow
          label="Profit Target"
          value={targetAmount ? `$${targetAmount.toLocaleString()}` : "Not set"}
          pct={targetProgress}
          color="#00D084"
        />

        <ProgressRow
          label="Drawdown Used"
          value={ddLimit ? `$${ddLimit.toLocaleString()} limit` : "Not set"}
          pct={ddUsed}
          color={riskColor}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <InfoBox
            icon={<Shield size={16} />}
            label="Max DD"
            value={maxDDPct ? `${maxDDPct}%` : "—"}
          />
          <InfoBox
            icon={<AlertTriangle size={16} />}
            label="Daily Loss"
            value={
              dailyLossAmount
                ? `$${dailyLossAmount.toLocaleString()}`
                : dailyLossPct
                  ? `${dailyLossPct}%`
                  : "—"
            }
          />
          <InfoBox
            icon={<Target size={16} />}
            label="Trailing"
            value={account.trailingDD ? "Yes" : "No"}
          />
        </div>

        {account.notes && (
          <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4 text-sm leading-6 text-[#A0A0C0]">
            {account.notes}
          </div>
        )}
      </div>
    </Card>
  );
}

function AccountMetric({
  label,
  value,
  color = "#F0F0FF",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#5A5A80]">
        {label}
      </div>
      <div className="mt-1 text-sm font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-black text-[#A0A0C0]">{label}</span>
        <span className="font-bold text-[#5A5A80]">{value}</span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#1E1E38]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
      <div className="flex items-center gap-2 text-[#F0B429]">{icon}</div>
      <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">
        {label}
      </div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}