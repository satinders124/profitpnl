"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
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

const inputClass = "w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F0B429]";

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
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        {hint ? <span className="font-mono2 text-[10px] text-zinc-600">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
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
  });

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/affiliates", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load affiliates.");
      setAffiliates(json.affiliates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load affiliates.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
      if (!res.ok) throw new Error(json.error || "Could not create affiliate.");
      setForm({ name: "", email: "", slug: "", couponCode: "", discountPercent: "20", discountDurationMonths: "3", commissionPercent: "30", commissionDurationMonths: "12", createStripePromo: true, grantFreeAccess: true, sendWelcomeEmail: true, notes: "" });
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
      setError(json.error || "Could not mark paid.");
    }
    await load();
  }

  return (
    <AppShell title="Admin · Affiliates" subtitle="Create influencer codes, track conversions, and manage payouts.">
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Create affiliate</h2>
              <p className="mt-1 text-xs text-zinc-500">Creates a ProfitPnL affiliate profile and optionally a Stripe promotion code.</p>
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
            <Field label="Coupon code" hint="shown in Stripe">
              <input className={inputClass} placeholder="TOM20" value={form.couponCode} onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))} />
            </Field>
            <Field label="User discount" hint="% off">
              <input className={inputClass} placeholder="20" value={form.discountPercent} onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))} />
            </Field>
            <Field label="Discount duration" hint="months">
              <input className={inputClass} placeholder="3" value={form.discountDurationMonths} onChange={(e) => setForm((f) => ({ ...f, discountDurationMonths: e.target.value }))} />
            </Field>
            <Field label="Influencer commission" hint="% of paid amount">
              <input className={inputClass} placeholder="30" value={form.commissionPercent} onChange={(e) => setForm((f) => ({ ...f, commissionPercent: e.target.value }))} />
            </Field>
            <Field label="Commission duration" hint="months">
              <input className={inputClass} placeholder="12" value={form.commissionDurationMonths} onChange={(e) => setForm((f) => ({ ...f, commissionDurationMonths: e.target.value }))} />
            </Field>
          </div>
          <p className="mt-3 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 text-xs leading-relaxed text-zinc-500">
            Example: <strong className="text-white">20</strong> + <strong className="text-white">3</strong> means users get 20% off for 3 months. <strong className="text-white">30</strong> + <strong className="text-white">12</strong> means the influencer earns 30% commission for 12 months.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={form.createStripePromo} onChange={(e) => setForm((f) => ({ ...f, createStripePromo: e.target.checked }))} className="accent-[#F0B429]" />
              Create Stripe coupon/promotion code
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={form.grantFreeAccess} onChange={(e) => setForm((f) => ({ ...f, grantFreeAccess: e.target.checked }))} className="accent-[#F0B429]" />
              Create/link ProfitPnL account + grant free Pro access
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={form.sendWelcomeEmail} onChange={(e) => setForm((f) => ({ ...f, sendWelcomeEmail: e.target.checked }))} className="accent-[#F0B429]" />
              Send affiliate confirmation email
            </label>
            <button onClick={createAffiliate} disabled={creating} className="gold-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-black disabled:opacity-60">
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-5 py-3 text-sm font-bold text-zinc-300 hover:text-[#F0B429]">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-bold text-white">Affiliates</h2>
          {loading ? (
            <div className="flex justify-center py-12 text-zinc-500"><Loader2 className="mr-2 animate-spin" /> Loading…</div>
          ) : affiliates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2A2A3C] p-8 text-center text-sm text-zinc-500">No affiliates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-zinc-500">
                  <tr><th className="py-3">Affiliate</th><th>Code</th><th>Offer</th><th>Clicks</th><th>Signups</th><th>Paid</th><th>Revenue</th><th>Commission</th><th>Stripe</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {affiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="border-t border-[#1E1E38]">
                      <td className="py-3"><div className="font-bold text-white">{affiliate.name}</div><div className="text-xs text-zinc-500">{affiliate.email} · /r/{affiliate.slug}</div></td>
                      <td className="font-mono2 text-[#F0B429]">{affiliate.coupon_code}</td>
                      <td className="text-zinc-300">{affiliate.discount_percent}% / {affiliate.commission_percent}%</td>
                      <td className="text-zinc-300">{affiliate.clicks}</td>
                      <td className="text-zinc-300">{affiliate.signups}</td>
                      <td className="text-zinc-300">{affiliate.paidCustomers}</td>
                      <td className="text-zinc-300">{money(affiliate.grossRevenueCents)}</td>
                      <td className="font-bold text-white">{money(affiliate.commissionCents)}</td>
                      <td className="text-xs text-zinc-500">{affiliate.stripe_promotion_code_id ? "promo connected" : "manual/no promo"}</td>
                      <td><button onClick={() => markPaid(affiliate.id)} className="rounded-lg border border-[#F0B429]/30 px-3 py-2 text-xs font-bold text-[#F0B429]">Mark paid</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
