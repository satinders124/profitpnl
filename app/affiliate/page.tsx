"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, Copy, ExternalLink, Loader2, Users, MousePointerClick, DollarSign, Receipt } from "lucide-react";
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
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0B429]/10 text-[#F0B429]">{icon}</div>
      </div>
    </Card>
  );
}

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<AffiliateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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

  async function copyReferral() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <AppShell title="Affiliate Dashboard" subtitle="Track referral links, coupon usage, and pending commission.">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500"><Loader2 className="mr-2 animate-spin" /> Loading affiliate dashboard…</div>
      ) : error ? (
        <Card className="p-6 text-red-300">{error}</Card>
      ) : !data?.affiliate ? (
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <Award className="mx-auto mb-4 text-[#F0B429]" size={42} />
          <h2 className="text-2xl font-black text-white">No affiliate account yet</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            This login is not connected to an active ProfitPnL affiliate profile. If you are an influencer or partner, contact the ProfitPnL team to activate your dashboard.
          </p>
          <Link href="/contact" className="mt-6 inline-flex rounded-xl border border-[#F0B429]/40 px-5 py-3 text-sm font-bold text-[#F0B429]">Contact ProfitPnL</Link>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-[#F0B429]/25 bg-gradient-to-br from-[#15120A] to-[#11111B] p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-mono2 text-xs uppercase tracking-widest text-[#F0B429]">Partner offer</p>
                <h2 className="mt-2 text-2xl font-black text-white">{data.affiliate.name}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Code <span className="font-mono2 font-bold text-[#F0B429]">{data.affiliate.couponCode}</span> gives users {data.affiliate.discountPercent}% off for {data.affiliate.discountDurationMonths} months. You earn {data.affiliate.commissionPercent}% commission for {data.affiliate.commissionDurationMonths} months.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={copyReferral} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F0B429] px-5 py-3 text-sm font-black text-black">
                  <Copy size={16} /> {copied ? "Copied" : "Copy Link"}
                </button>
                <Link href={referralUrl} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#F0B429]/40 px-5 py-3 text-sm font-bold text-[#F0B429]">
                  Open <ExternalLink size={15} />
                </Link>
              </div>
            </div>
            <p className="mt-4 truncate rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 font-mono2 text-xs text-zinc-400">{referralUrl}</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clicks" value={String(data.summary?.clicks || 0)} icon={<MousePointerClick size={20} />} />
            <StatCard label="Signups" value={String(data.summary?.signups || 0)} icon={<Users size={20} />} />
            <StatCard label="Paid customers" value={String(data.summary?.paidCustomers || 0)} icon={<Receipt size={20} />} />
            <StatCard label="Pending commission" value={money(data.summary?.pendingCommissionCents || 0)} icon={<DollarSign size={20} />} />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold text-white">Recent commissions</h2>
            {data.commissions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#2A2A3C] p-8 text-center text-sm text-zinc-500">No paid conversions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-widest text-zinc-500">
                    <tr><th className="py-3">Date</th><th>Customer</th><th>Code</th><th>Gross</th><th>Commission</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((row) => (
                      <tr key={row.id} className="border-t border-[#1E1E38]">
                        <td className="py-3 text-zinc-400">{new Date(row.created_at).toLocaleDateString()}</td>
                        <td className="text-zinc-300">{row.customer}</td>
                        <td className="font-mono2 text-[#F0B429]">{row.coupon_code || data.affiliate?.couponCode}</td>
                        <td className="text-zinc-300">{row.grossFormatted}</td>
                        <td className="font-bold text-white">{row.commissionFormatted}</td>
                        <td><span className="rounded-full border border-[#F0B429]/25 bg-[#F0B429]/10 px-2 py-1 text-xs font-bold text-[#F0B429]">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
