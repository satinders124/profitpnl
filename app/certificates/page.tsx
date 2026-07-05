"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, Check, Copy, ExternalLink, Eye, Loader2, Lock, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase-client";
import { getAccounts } from "@/lib/db";
import type { TradingAccount } from "@/types/account";
import type { CertificateMetrics, CertificatePrivacy } from "@/lib/certificates";

type CertificateListItem = {
  public_id: string;
  title: string;
  account_name: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  status: string;
  data_source: string;
  period_start: string;
  period_end: string;
  metrics: CertificateMetrics;
  privacy: CertificatePrivacy;
  created_at: string;
  revoked_at: string | null;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5A5A80] focus:border-[#F0B429]/70";

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtPct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function fmtCurrency(value: number | null | undefined, currency: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3.5 py-3 text-sm text-zinc-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#F0B429]"
      />
    </label>
  );
}

export default function CertificatesPage() {
  const { user, displayName } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [certificates, setCertificates] = useState<CertificateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [title, setTitle] = useState("Trading Performance Certificate");
  const [accountName, setAccountName] = useState("");
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [privacy, setPrivacy] = useState<CertificatePrivacy>({
    showDisplayName: true,
    showDollarPnl: true,
    showAccountName: true,
    showReturnPercent: true,
    showRMetrics: true,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "https://profitpnl.com";

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const loadCertificates = useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch("/api/certificates", { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not load certificates.");
    setCertificates(json.certificates || []);
  }, [authHeaders]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const [accountData] = await Promise.all([getAccounts(user.id), loadCertificates()]);
        setAccounts(accountData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load certificates.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, loadCertificates]);

  const activeCertificates = useMemo(
    () => certificates.filter((certificate) => certificate.status === "active"),
    [certificates]
  );

  async function createCertificate() {
    setCreating(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/certificates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          title,
          accountName: accountName || undefined,
          periodStart,
          periodEnd,
          isAnonymous,
          privacy: {
            ...privacy,
            showDisplayName: !isAnonymous && privacy.showDisplayName,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create certificate.");
      await loadCertificates();
      window.open(`/cert/${json.publicId}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create certificate.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(publicId: string) {
    if (!confirm("Revoke this certificate? The public link will stop working.")) return;
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/certificates/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ publicId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not revoke certificate.");
      await loadCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke certificate.");
    }
  }

  async function copyLink(publicId: string) {
    const url = `${origin}/cert/${publicId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <AppShell
      title="Certificates"
      subtitle="Create verified public snapshots of your trading performance."
      actionLabel="Generate"
      onAction={createCertificate}
    >
      <div className="space-y-6">
        <Card className="border-[#F0B429]/20 bg-gradient-to-br from-[#15120A] to-[#11111B] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0B429]/12 text-[#F0B429]">
                <Award size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Trading Performance Certificate</h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
                  Generate a shareable ProfitPnL certificate from your journal data. Each certificate is an immutable, hash-verified snapshot with a public link and QR code.
                </p>
              </div>
            </div>
            <Link href="/certificates#my-certificates" className="inline-flex items-center gap-2 text-sm font-semibold text-[#F0B429]">
              My Certificates <ExternalLink size={14} />
            </Link>
          </div>
        </Card>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="p-5 xl:col-span-3">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Generate new certificate</h2>
                <p className="mt-1 text-xs text-zinc-500">Stats are calculated server-side from your saved trades.</p>
              </div>
              <ShieldCheck size={20} className="text-emerald-400" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-zinc-500">Certificate Title</label>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Account</label>
                <select value={accountName} onChange={(event) => setAccountName(event.target.value)} className={inputClass}>
                  <option value="">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.name}>{account.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Display Name</label>
                <input value={isAnonymous ? "Anonymous Trader" : displayName || user?.email?.split("@")[0] || "Trader"} disabled className={`${inputClass} opacity-70`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">Start Date</label>
                <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500">End Date</label>
                <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ToggleRow label="Anonymous mode" checked={isAnonymous} onChange={setIsAnonymous} />
              <ToggleRow label="Show dollar P&L" checked={privacy.showDollarPnl} onChange={(checked) => setPrivacy((p) => ({ ...p, showDollarPnl: checked }))} />
              <ToggleRow label="Show account name" checked={privacy.showAccountName} onChange={(checked) => setPrivacy((p) => ({ ...p, showAccountName: checked }))} />
              <ToggleRow label="Show return %" checked={privacy.showReturnPercent} onChange={(checked) => setPrivacy((p) => ({ ...p, showReturnPercent: checked }))} />
              <ToggleRow label="Show R-metrics" checked={privacy.showRMetrics} onChange={(checked) => setPrivacy((p) => ({ ...p, showRMetrics: checked }))} />
              <ToggleRow label="Show display name" checked={!isAnonymous && privacy.showDisplayName} onChange={(checked) => setPrivacy((p) => ({ ...p, showDisplayName: checked }))} />
            </div>

            <button
              type="button"
              onClick={createCertificate}
              disabled={creating}
              className="gold-gradient mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black transition-opacity disabled:opacity-60"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? "Generating…" : "Generate Certificate"}
            </button>
          </Card>

          <Card className="p-5 xl:col-span-2">
            <h2 className="text-base font-bold text-white">What gets verified?</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <div className="flex gap-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>Stats are calculated from trades already stored in ProfitPnL.</span>
              </div>
              <div className="flex gap-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>Certificate data is snapshotted and signed with a server-side hash.</span>
              </div>
              <div className="flex gap-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] p-3">
                <Lock size={16} className="mt-0.5 shrink-0 text-[#F0B429]" />
                <span>You control privacy: hide name, account name, dollars, or R-metrics.</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              Certificates are journal-verified snapshots, not broker-audited statements. You can revoke a certificate any time.
            </p>
          </Card>
        </div>

        <div id="my-certificates">
          <Card className="p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-white">My certificates</h2>
              <p className="mt-1 text-xs text-zinc-500">Public links you have generated from your journal.</p>
            </div>
            <button onClick={loadCertificates} className="inline-flex items-center gap-2 rounded-lg border border-[#1E1E38] px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-[#F0B429]">
              <RotateCcw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
              <Loader2 size={18} className="mr-2 animate-spin" /> Loading certificates…
            </div>
          ) : activeCertificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2A2A3C] p-8 text-center">
              <Award className="mx-auto mb-3 text-[#5A5A80]" />
              <p className="text-sm font-semibold text-white">No active certificates yet</p>
              <p className="mt-1 text-xs text-zinc-500">Generate one above once you have closed trades in your selected date range.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCertificates.map((certificate) => {
                const url = `${origin}/cert/${certificate.public_id}`;
                return (
                  <div key={certificate.public_id} className="rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white">{certificate.title}</h3>
                          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">ACTIVE</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {fmtDate(certificate.period_start)} — {fmtDate(certificate.period_end)} · {certificate.account_name || "All accounts"} · {certificate.metrics.tradeCount} trades
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-lg bg-[#151522] px-2.5 py-1 text-zinc-300">Win rate {(certificate.metrics.winRate * 100).toFixed(1)}%</span>
                          <span className="rounded-lg bg-[#151522] px-2.5 py-1 text-zinc-300">Avg R {certificate.metrics.averageR >= 0 ? "+" : ""}{certificate.metrics.averageR.toFixed(2)}R</span>
                          {certificate.privacy.showDollarPnl ? <span className="rounded-lg bg-[#151522] px-2.5 py-1 text-zinc-300">P&L {fmtCurrency(certificate.metrics.netPnl, certificate.metrics.currency)}</span> : null}
                          {certificate.privacy.showReturnPercent ? <span className="rounded-lg bg-[#151522] px-2.5 py-1 text-zinc-300">Return {fmtPct(certificate.metrics.returnPercent)}</span> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/cert/${certificate.public_id}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E1E38] px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-[#F0B429]">
                          <Eye size={14} /> View
                        </Link>
                        <button onClick={() => copyLink(certificate.public_id)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E1E38] px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-[#F0B429]">
                          {copiedId === certificate.public_id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {copiedId === certificate.public_id ? "Copied" : "Copy"}
                        </button>
                        <button onClick={() => revoke(certificate.public_id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10">
                          <Trash2 size={14} /> Revoke
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 truncate font-mono2 text-[11px] text-[#5A5A80]">{url}</p>
                  </div>
                );
              })}
            </div>
          )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
