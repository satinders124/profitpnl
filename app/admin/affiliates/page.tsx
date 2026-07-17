"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Copy,
  ExternalLink,
  Loader2,
  MousePointerClick,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase-client";

type AffiliateAdminRow = {
  id: string;
  name: string;
  email: string;
  slug: string;
  coupon_code: string;
  discount_percent: number;
  discount_duration_months: number;
  commission_percent: number;
  commission_duration_months: number;
  status: string;
  stripe_promotion_code_id: string | null;
  clicks: number;
  signups: number;
  paidCustomers: number;
  grossRevenueCents: number;
  commissionCents: number;
};

const inputClass = "w-full rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-[#F0B429]";

const initialForm = {
  name: "",
  email: "",
  slug: "",
  couponCode: "",
  discountPercent: "20",
  discountDurationMonths: "3",
  commissionPercent: "30",
  commissionDurationMonths: "12",
  createStripePromo: true,
  grantFreeAccess: true,
  sendWelcomeEmail: true,
  notes: "",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</span>
        {hint ? <span className="font-mono text-[10px] text-[#5A5A80]">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function safeDiv(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function OpsStat({ label, value, sub, icon, tone = "gold" }: { label: string; value: string; sub: string; icon: React.ReactNode; tone?: "gold" | "green" | "blue" }) {
  const color = tone === "green" ? "#00D084" : tone === "blue" ? "#4C82FB" : "#F0B429";
  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20">
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs leading-5 text-[#8080A0]">{sub}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-black/20" style={{ color, borderColor: `${color}40` }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const adminForbiddenMessage = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession();
    const email = session?.user?.email || "this login";
    return `Forbidden: ${email} is not configured as an admin. Add this email to ADMIN_EMAILS in Vercel, then redeploy.`;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/affiliates", { headers });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(res.status === 403 ? await adminForbiddenMessage() : json.error || "Could not load affiliates.");
      }
      setAffiliates(json.affiliates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load affiliates.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, adminForbiddenMessage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filteredAffiliates = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return affiliates;
    return affiliates.filter((affiliate) =>
      [affiliate.name, affiliate.email, affiliate.slug, affiliate.coupon_code]
        .join(" ")
        .toLowerCase()
        .includes(clean)
    );
  }, [affiliates, query]);

  const totals = useMemo(() => {
    const clicks = affiliates.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const signups = affiliates.reduce((sum, row) => sum + Number(row.signups || 0), 0);
    const paid = affiliates.reduce((sum, row) => sum + Number(row.paidCustomers || 0), 0);
    const gross = affiliates.reduce((sum, row) => sum + Number(row.grossRevenueCents || 0), 0);
    const commission = affiliates.reduce((sum, row) => sum + Number(row.commissionCents || 0), 0);
    return { clicks, signups, paid, gross, commission, signupRate: safeDiv(signups, clicks), paidRate: safeDiv(paid, signups) };
  }, [affiliates]);

  async function createAffiliate() {
    setCreating(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          ...form,
          discountPercent: Number(form.discountPercent),
          discountDurationMonths: Number(form.discountDurationMonths),
          commissionPercent: Number(form.commissionPercent),
          commissionDurationMonths: Number(form.commissionDurationMonths),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(res.status === 403 ? await adminForbiddenMessage() : json.error || "Could not create affiliate.");
      }
      setForm(initialForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create affiliate.");
    } finally {
      setCreating(false);
    }
  }

  async function markPaid(affiliateId: string) {
    if (!confirm("Mark all pending/approved commissions for this affiliate as paid?")) return;
    const headers = await authHeaders();
    const res = await fetch("/api/admin/commissions/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ affiliateId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(res.status === 403 ? await adminForbiddenMessage() : json.error || "Could not mark paid.");
    }
    await load();
  }

  async function copyAffiliateLink(affiliate: AffiliateAdminRow) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://profitpnl.com";
    await navigator.clipboard.writeText(`${origin}/r/${affiliate.slug}`);
    setCopiedId(affiliate.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  return (
    <AppShell title="Affiliate Ops Center" subtitle="Create partner codes, track funnel performance, and manage payouts.">
      <div className="space-y-7 pb-24">
        {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
          <div className="relative grid gap-7 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                <Sparkles size={12} /> ProfitPnL Growth Desk
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Affiliate Ops Center</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                Manage creator partners, track clicks-to-customer conversion, and keep commission payouts controlled from one command center.
              </p>
            </div>
            <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Total Commission</p>
              <p className="mt-2 text-4xl font-black tracking-tighter text-[#00D084]">{money(totals.commission)}</p>
              <p className="mt-1 text-xs text-[#8080A0]">Across {affiliates.length} active or historical affiliates.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                  <p className="text-[#5A5A80]">Revenue</p>
                  <p className="mt-1 font-black text-white">{money(totals.gross)}</p>
                </div>
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
                  <p className="text-[#5A5A80]">Paid Customers</p>
                  <p className="mt-1 font-black text-[#F0B429]">{totals.paid}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OpsStat label="Clicks" value={String(totals.clicks)} sub="Referral visits tracked" icon={<MousePointerClick size={20} />} />
          <OpsStat label="Signups" value={String(totals.signups)} sub={`${pct(totals.signupRate)} click → signup`} icon={<Users size={20} />} tone="blue" />
          <OpsStat label="Paid Customers" value={String(totals.paid)} sub={`${pct(totals.paidRate)} signup → paid`} icon={<ReceiptIcon />} tone="green" />
          <OpsStat label="Revenue" value={money(totals.gross)} sub="Gross subscription revenue" icon={<TrendingUp size={20} />} tone="green" />
        </div>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Create Partner</p>
              <h2 className="mt-1 text-lg font-black text-white">Affiliate onboarding</h2>
              <p className="mt-1 text-xs text-[#8080A0]">Creates the affiliate profile and optionally Stripe promo + free Pro access.</p>
            </div>
            <ShieldCheck className="text-[#F0B429]" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Influencer name">
              <input className={inputClass} placeholder="Trader Tom" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Influencer email" hint="must match login">
              <input className={inputClass} placeholder="tom@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Referral slug" hint="/r/slug">
              <input className={inputClass} placeholder="trader-tom" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </Field>
            <Field label="Coupon code" hint="Stripe code">
              <input className={inputClass} placeholder="TOM20" value={form.couponCode} onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))} />
            </Field>
            <Field label="User discount" hint="% off">
              <input className={inputClass} placeholder="20" value={form.discountPercent} onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))} />
            </Field>
            <Field label="Discount duration" hint="months">
              <input className={inputClass} placeholder="3" value={form.discountDurationMonths} onChange={(e) => setForm((f) => ({ ...f, discountDurationMonths: e.target.value }))} />
            </Field>
            <Field label="Influencer commission" hint="% paid amount">
              <input className={inputClass} placeholder="30" value={form.commissionPercent} onChange={(e) => setForm((f) => ({ ...f, commissionPercent: e.target.value }))} />
            </Field>
            <Field label="Commission duration" hint="months">
              <input className={inputClass} placeholder="12" value={form.commissionDurationMonths} onChange={(e) => setForm((f) => ({ ...f, commissionDurationMonths: e.target.value }))} />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[
              ["createStripePromo", "Create Stripe coupon/promotion code"],
              ["grantFreeAccess", "Create/link account + grant free Pro access"],
              ["sendWelcomeEmail", "Send affiliate confirmation email"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof typeof form])}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  className="accent-[#F0B429]"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button onClick={createAffiliate} disabled={creating} className="gold-gradient inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-black disabled:opacity-60">
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Affiliate
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-5 py-3 text-sm font-black text-zinc-300 hover:text-[#F0B429]">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Affiliate Ledger</p>
              <h2 className="mt-1 text-lg font-black text-white">Partners</h2>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A80]" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, code, slug…"
                className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#F0B429]"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="mr-2 animate-spin" /> Loading affiliates…</div>
          ) : filteredAffiliates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">No affiliates match this search.</p>
          ) : (
            <div className="space-y-4">
              {filteredAffiliates.map((affiliate) => {
                const signupRate = safeDiv(affiliate.signups, affiliate.clicks);
                const paidRate = safeDiv(affiliate.paidCustomers, affiliate.signups);
                return (
                  <div key={affiliate.id} className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810] p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-white">{affiliate.name}</h3>
                          <span className="rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-2.5 py-1 font-mono text-[10px] font-black text-[#F0B429]">{affiliate.coupon_code}</span>
                          <span className="rounded-full border border-[#00D084]/30 bg-[#00D084]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#00D084]">{affiliate.status}</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-[#8080A0]">{affiliate.email} · /r/{affiliate.slug}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:min-w-[720px]">
                        <Mini label="Clicks" value={String(affiliate.clicks)} />
                        <Mini label="Signups" value={`${affiliate.signups} · ${pct(signupRate)}`} />
                        <Mini label="Paid" value={`${affiliate.paidCustomers} · ${pct(paidRate)}`} />
                        <Mini label="Revenue" value={money(affiliate.grossRevenueCents)} />
                        <Mini label="Commission" value={money(affiliate.commissionCents)} highlight />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1E1E38] pt-4">
                      <button onClick={() => copyAffiliateLink(affiliate)} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2 text-xs font-black text-zinc-300 hover:text-[#F0B429]">
                        <Copy size={13} /> {copiedId === affiliate.id ? "Copied" : "Copy Link"}
                      </button>
                      <a href={`/r/${affiliate.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2 text-xs font-black text-zinc-300 hover:text-white">
                        <ExternalLink size={13} /> Test
                      </a>
                      <button onClick={() => markPaid(affiliate.id)} className="inline-flex items-center gap-2 rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-2 text-xs font-black text-[#F0B429]">
                        <BadgeDollarSign size={13} /> Mark Paid
                      </button>
                      <span className="rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2 text-xs font-bold text-[#8080A0]">
                        {affiliate.discount_percent}% off / {affiliate.commission_percent}% commission · {affiliate.stripe_promotion_code_id ? "Stripe connected" : "manual/no promo"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Mini({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#111124] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">{label}</p>
      <p className={`mt-1 truncate text-xs font-black ${highlight ? "text-[#00D084]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function ReceiptIcon() {
  return <Wallet size={20} />;
}
