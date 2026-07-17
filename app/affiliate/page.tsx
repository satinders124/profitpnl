"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  Gift,
  Loader2,
  MousePointerClick,
  Receipt,
  Rocket,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase-client";

type AffiliateResponse = {
  affiliate: null | {
    name: string;
    email: string;
    slug: string;
    couponCode: string;
    discountPercent: number;
    discountDurationMonths: number;
    commissionPercent: number;
    commissionDurationMonths: number;
    status: string;
  };
  links?: { referralPath: string };
  summary?: {
    clicks: number;
    signups: number;
    paidCustomers: number;
    grossRevenueCents: number;
    pendingCommissionCents: number;
    approvedCommissionCents: number;
    paidCommissionCents: number;
  };
  commissions: Array<{
    id: string;
    customer: string;
    coupon_code: string | null;
    status: string;
    created_at: string;
    grossFormatted: string;
    commissionFormatted: string;
  }>;
  payouts?: Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    period_start: string | null;
    period_end: string | null;
    paid_at: string | null;
    notes: string | null;
    created_at: string;
  }>;
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function safeDiv(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function statusTone(status: string) {
  const clean = status.toLowerCase();
  if (clean === "paid") return "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]";
  if (clean === "approved") return "border-[#4C82FB]/30 bg-[#4C82FB]/10 text-[#8BB0FF]";
  if (clean === "reversed") return "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]";
  return "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]";
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "gold",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "gold" | "green" | "blue" | "red";
}) {
  const color =
    tone === "green" ? "#00D084" : tone === "blue" ? "#4C82FB" : tone === "red" ? "#FF4565" : "#F0B429";

  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20">
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-white" title={value}>{value}</p>
          <p className="mt-1 text-xs leading-5 text-[#8080A0]">{sub}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-black/20" style={{ color, borderColor: `${color}40` }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function CopyBox({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2.5 font-mono text-xs text-zinc-300" title={value}>
          {value}
        </p>
        <button
          onClick={onCopy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0B429] text-[#080810] transition active:scale-95"
          aria-label={`Copy ${label}`}
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function FunnelStage({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
      <div className="flex items-center gap-2 text-[#F0B429]">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-[#8080A0]">{sub}</p>
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<AffiliateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/affiliate/me", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load affiliate dashboard.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load affiliate dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://profitpnl.com";
  const referralUrl = data?.affiliate ? `${origin}/r/${data.affiliate.slug}` : "";
  const checkoutUrl = data?.affiliate ? `${origin}/upgrade?coupon=${encodeURIComponent(data.affiliate.couponCode)}` : "";

  const summary = data?.summary;
  const derived = useMemo(() => {
    const clicks = summary?.clicks || 0;
    const signups = summary?.signups || 0;
    const paidCustomers = summary?.paidCustomers || 0;
    const pending = summary?.pendingCommissionCents || 0;
    const approved = summary?.approvedCommissionCents || 0;
    const paid = summary?.paidCommissionCents || 0;
    const gross = summary?.grossRevenueCents || 0;
    return {
      clicks,
      signups,
      paidCustomers,
      pending,
      approved,
      paid,
      gross,
      readyForPayout: pending + approved,
      totalCommission: pending + approved + paid,
      signupRate: safeDiv(signups, clicks),
      paidRate: safeDiv(paidCustomers, signups),
      epcCents: clicks ? Math.round((pending + approved + paid) / clicks) : 0,
    };
  }, [summary]);

  async function copy(value: string, kind: "link" | "code") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    if (kind === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  }

  return (
    <AppShell title="Partner Command Center" subtitle="Track your link, funnel, commissions, and payouts.">
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500">
          <Loader2 className="mr-2 animate-spin" /> Loading partner dashboard…
        </div>
      ) : error ? (
        <Card className="border-red-500/30 bg-red-500/10 p-6 text-red-300">{error}</Card>
      ) : !data?.affiliate ? (
        <Card className="mx-auto max-w-2xl overflow-hidden border-[#F0B429]/25 bg-[#0D0D1A] p-8 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F0B429]/10 text-[#F0B429]">
            <Award size={36} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">No partner account yet</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            This login is not connected to an active ProfitPnL affiliate profile. If you are an influencer, community owner, or trading educator, contact the ProfitPnL team to activate your partner dashboard.
          </p>
          <Link href="/contact" className="gold-gradient mt-7 inline-flex rounded-2xl px-6 py-3 text-sm font-black text-[#080810]">
            Apply for partnership
          </Link>
        </Card>
      ) : (
        <div className="space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.85fr] lg:p-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                  <Sparkles size={12} /> ProfitPnL Partner Program
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">
                    {data.affiliate.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                    Share ProfitPnL with your audience. They get <span className="font-black text-[#F0B429]">{data.affiliate.discountPercent}% off</span> for {data.affiliate.discountDurationMonths} months, and you earn <span className="font-black text-[#00D084]">{data.affiliate.commissionPercent}% commission</span> for {data.affiliate.commissionDurationMonths} months.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CopyBox label="Referral Link" value={referralUrl} copied={copiedLink} onCopy={() => copy(referralUrl, "link")} />
                  <CopyBox label="Coupon Code" value={data.affiliate.couponCode} copied={copiedCode} onCopy={() => copy(data.affiliate!.couponCode, "code")} />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => copy(referralUrl, "link")} className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810]">
                    <Share2 size={16} /> Copy Campaign Link
                  </button>
                  <Link href={referralUrl} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F0B429]/40 bg-[#F0B429]/10 px-5 py-3 text-sm font-black text-[#F0B429]">
                    Test Link <ExternalLink size={15} />
                  </Link>
                  <Link href={checkoutUrl} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-5 py-3 text-sm font-black text-zinc-300 hover:text-white">
                    Offer Page <Gift size={15} />
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Partner Earnings</p>
                <p className="mt-2 text-4xl font-black tracking-tighter text-[#00D084]">{money(derived.readyForPayout)}</p>
                <p className="mt-1 text-xs text-[#8080A0]">Pending + approved commission ready to process.</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Total Earned</p>
                    <p className="mt-1 text-sm font-black text-white">{money(derived.totalCommission)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Paid Out</p>
                    <p className="mt-1 text-sm font-black text-[#F0B429]">{money(derived.paid)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">EPC</p>
                    <p className="mt-1 text-sm font-black text-white">{money(derived.epcCents)}</p>
                  </div>
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">Status</p>
                    <p className="mt-1 text-sm font-black text-[#00D084]">{data.affiliate.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clicks" value={String(derived.clicks)} sub="Tracked referral visits" icon={<MousePointerClick size={20} />} />
            <StatCard label="Signups" value={String(derived.signups)} sub={`${pct(derived.signupRate)} click → signup`} icon={<Users size={20} />} tone="blue" />
            <StatCard label="Paid Customers" value={String(derived.paidCustomers)} sub={`${pct(derived.paidRate)} signup → paid`} icon={<Receipt size={20} />} tone="green" />
            <StatCard label="Gross Revenue" value={money(derived.gross)} sub="Revenue generated" icon={<DollarSign size={20} />} tone="green" />
          </div>

          <section className="grid gap-7 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Conversion Funnel</p>
                  <h2 className="mt-1 text-lg font-black text-white">Audience journey</h2>
                </div>
                <TrendingUp className="text-[#F0B429]" size={22} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <FunnelStage label="Traffic" value={String(derived.clicks)} sub="Link clicks captured" icon={<MousePointerClick size={14} />} />
                <FunnelStage label="Accounts" value={String(derived.signups)} sub={`${pct(derived.signupRate)} conversion`} icon={<Users size={14} />} />
                <FunnelStage label="Customers" value={String(derived.paidCustomers)} sub={`${pct(derived.paidRate)} paid rate`} icon={<Rocket size={14} />} />
              </div>
            </Card>

            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Recent Commissions</p>
                  <h2 className="mt-1 text-lg font-black text-white">Revenue ledger</h2>
                </div>
                <Wallet className="text-[#F0B429]" size={22} />
              </div>
              {data.commissions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">No paid conversions yet. Share your campaign link to start building your ledger.</p>
              ) : (
                <div className="space-y-3">
                  {data.commissions.slice(0, 8).map((row) => (
                    <div key={row.id} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{row.customer}</p>
                          <p className="mt-1 text-xs text-[#8080A0]">{new Date(row.created_at).toLocaleDateString()} · Code <span className="font-mono text-[#F0B429]">{row.coupon_code || data.affiliate?.couponCode}</span></p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusTone(row.status)}`}>{row.status}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-[#111124] px-3 py-2">
                          <p className="text-[#5A5A80]">Gross</p>
                          <p className="mt-1 font-black text-zinc-200">{row.grossFormatted}</p>
                        </div>
                        <div className="rounded-xl bg-[#111124] px-3 py-2">
                          <p className="text-[#5A5A80]">Commission</p>
                          <p className="mt-1 font-black text-[#00D084]">{row.commissionFormatted}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Creator Assets</p>
                <h2 className="mt-1 text-lg font-black text-white">Copy-and-paste campaign angles</h2>
              </div>
              <BarChart3 className="text-[#F0B429]" size={22} />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                "AI trading journal for prop traders who want to find leaks before they cost a payout.",
                `Use code ${data.affiliate.couponCode} for ${data.affiliate.discountPercent}% off ProfitPnL for ${data.affiliate.discountDurationMonths} months.`,
                "Track trades, manage AI Risk-Guard sessions, review analytics, and build a professional trading process.",
              ].map((text) => (
                <div key={text} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-xs leading-6 text-zinc-300">
                  {text}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
