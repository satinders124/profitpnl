import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { AlertTriangle, Award, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { createServerClient } from "@/lib/supabase-server";
import {
  displayCertificateId,
  formatDateRange,
  isCertificateSignatureValid,
  normalizePrivacy,
  type CertificateSnapshot,
} from "@/lib/certificates";
import { CertificateActions } from "./CertificateActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com";

async function getCertificate(publicId: string): Promise<CertificateSnapshot | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("certificates")
      .select("public_id, user_id, account_name, title, display_name, is_anonymous, status, data_source, period_start, period_end, metrics, privacy, certificate_hash, created_at, revoked_at")
      .eq("public_id", publicId)
      .eq("visibility", "public")
      .maybeSingle();

    if (error) {
      console.error("Public certificate load error:", error);
      return null;
    }

    if (!data || data.status !== "active") return null;

    return {
      ...data,
      privacy: normalizePrivacy(data.privacy),
    } as CertificateSnapshot;
  } catch (error) {
    console.error("Public certificate load exception:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params;
  const certificate = await getCertificate(publicId);

  if (!certificate) {
    return {
      title: "Trading Certificate Not Found | ProfitPnL",
      description: "This ProfitPnL trading performance certificate could not be found or has been revoked.",
    };
  }

  const trader = certificate.is_anonymous || !certificate.privacy.showDisplayName
    ? "A ProfitPnL trader"
    : certificate.display_name || "A ProfitPnL trader";

  return {
    title: `${trader}'s Trading Performance Certificate | ProfitPnL`,
    description: `Verified ProfitPnL trading performance snapshot for ${formatDateRange(certificate.period_start, certificate.period_end)}.`,
    alternates: { canonical: `/cert/${certificate.public_id}` },
    openGraph: {
      title: `${trader}'s Trading Performance Certificate`,
      description: "Verified ProfitPnL trading performance snapshot.",
      url: `/cert/${certificate.public_id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${trader}'s Trading Performance Certificate`,
      description: "Verified ProfitPnL trading performance snapshot.",
    },
  };
}

function fmtNumber(value: number, digits = 2) {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtSigned(value: number, suffix = "", digits = 2) {
  return `${value >= 0 ? "+" : ""}${fmtNumber(value, digits)}${suffix}`;
}

function fmtCurrency(value: number | null, currency: string) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "bull" | "bear" | "gold" | "neutral" }) {
  const toneClass = tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "gold" ? "text-gold" : "text-txt";
  return (
    <div className="rounded-2xl border border-line bg-ink2/70 p-4">
      <p className="font-mono2 text-[11px] uppercase tracking-widest text-dim">{label}</p>
      <p className={`mt-2 font-mono2 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function PublicCertificatePage({ params }: PageProps) {
  const { publicId } = await params;
  const certificate = await getCertificate(publicId);

  if (!certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4 text-txt">
        <div className="profit-card max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bear/10 text-bear">
            <AlertTriangle size={26} />
          </div>
          <h1 className="text-2xl font-bold">Certificate not found</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted2">
            This ProfitPnL certificate does not exist, is private, or has been revoked by the trader.
          </p>
          <Link href="/" className="gold-gradient mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold text-ink">
            Back to ProfitPnL
          </Link>
        </div>
      </div>
    );
  }

  const verified = isCertificateSignatureValid(certificate);
  const url = `${SITE_URL}/cert/${certificate.public_id}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 180,
    color: { dark: "#080810", light: "#ffffff" },
  });

  const metrics = certificate.metrics;
  const privacy = certificate.privacy;
  const traderName = certificate.is_anonymous || !privacy.showDisplayName
    ? "Anonymous Trader"
    : certificate.display_name || "ProfitPnL Trader";
  const accountName = privacy.showAccountName
    ? certificate.account_name || "All Accounts"
    : "Private Account";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: certificate.title,
    identifier: displayCertificateId(certificate.public_id),
    dateCreated: certificate.created_at,
    creator: { "@type": "Organization", name: "ProfitPnL" },
    url,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased print:bg-white print:text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pointer-events-none fixed inset-0 -z-10 trading-grid opacity-40 print:hidden" />
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px] print:hidden" />

      <header className="border-b border-line/60 bg-ink/80 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ProfitPnL" className="h-8 w-auto" />
          </Link>
          <Link href="/register" className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink">
            Create Yours Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 print:max-w-none print:p-0">
        <div className="mb-6 text-center print:hidden">
          <p className="font-mono2 text-xs uppercase tracking-[0.3em] text-gold">Verified Trading Snapshot</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Trading Performance Certificate</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted2">
            A public, immutable snapshot generated from trade records stored in ProfitPnL at the time of issue.
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[28px] border border-gold/30 bg-panel shadow-[0_0_80px_rgba(240,180,41,0.12)] print:border-black print:bg-white print:shadow-none">
          <div className="absolute inset-x-0 top-0 h-1 gold-gradient" />
          <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-gold/10 blur-[90px] print:hidden" />

          <div className="relative p-6 sm:p-9 lg:p-10">
            <div className="flex flex-col gap-6 border-b border-line/70 pb-7 lg:flex-row lg:items-start lg:justify-between print:border-zinc-300">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
                    <Award size={14} /> ProfitPnL Certificate
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${verified ? "border-bull/30 bg-bull/10 text-bull" : "border-bear/30 bg-bear/10 text-bear"}`}>
                    {verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {verified ? "Verified Snapshot" : "Signature Invalid"}
                  </span>
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl print:text-black">{certificate.title}</h2>
                <p className="mt-3 text-sm text-muted2 print:text-zinc-700">
                  Generated for <span className="font-semibold text-txt print:text-black">{traderName}</span> · {accountName}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-line bg-white p-3 print:border-zinc-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Certificate QR code" className="h-36 w-36" />
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Period" value={formatDateRange(certificate.period_start, certificate.period_end)} tone="gold" />
              <MetricCard label="Trades" value={String(metrics.tradeCount)} />
              <MetricCard label="Win Rate" value={`${(metrics.winRate * 100).toFixed(1)}%`} tone="gold" />
              <MetricCard label="Profit Factor" value={metrics.profitFactor >= 99 ? "∞" : fmtNumber(metrics.profitFactor, 2)} tone={metrics.profitFactor >= 1 ? "bull" : "bear"} />

              {privacy.showDollarPnl ? (
                <MetricCard label="Net P&L" value={fmtCurrency(metrics.netPnl, metrics.currency)} tone={(metrics.netPnl || 0) >= 0 ? "bull" : "bear"} />
              ) : null}
              {privacy.showReturnPercent ? (
                <MetricCard label="Return" value={metrics.returnPercent === null ? "—" : fmtSigned(metrics.returnPercent * 100, "%", 2)} tone={(metrics.returnPercent || 0) >= 0 ? "bull" : "bear"} />
              ) : null}
              {privacy.showRMetrics ? (
                <>
                  <MetricCard label="Total R" value={fmtSigned(metrics.totalR, "R", 2)} tone={metrics.totalR >= 0 ? "bull" : "bear"} />
                  <MetricCard label="Average R" value={fmtSigned(metrics.averageR, "R", 2)} tone={metrics.averageR >= 0 ? "bull" : "bear"} />
                  <MetricCard label="Max Drawdown" value={`-${fmtNumber(metrics.maxDrawdownR, 2)}R`} tone="bear" />
                  <MetricCard label="Best Trade" value={fmtSigned(metrics.bestTradeR, "R", 2)} tone="bull" />
                </>
              ) : null}
            </div>

            <div className="mt-8 grid gap-5 border-t border-line/70 pt-6 lg:grid-cols-3 print:border-zinc-300">
              <div className="rounded-2xl border border-line bg-ink2/60 p-5 print:border-zinc-300 print:bg-white">
                <p className="font-mono2 text-[11px] uppercase tracking-widest text-dim">Certificate ID</p>
                <p className="mt-2 break-all font-mono2 text-sm font-bold text-gold print:text-black">{displayCertificateId(certificate.public_id)}</p>
              </div>
              <div className="rounded-2xl border border-line bg-ink2/60 p-5 print:border-zinc-300 print:bg-white">
                <p className="font-mono2 text-[11px] uppercase tracking-widest text-dim">Issued</p>
                <p className="mt-2 text-sm font-semibold text-txt print:text-black">{new Date(certificate.created_at).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-line bg-ink2/60 p-5 print:border-zinc-300 print:bg-white">
                <p className="font-mono2 text-[11px] uppercase tracking-widest text-dim">Data Source</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-txt print:text-black">
                  <ShieldCheck size={16} className="text-bull" /> ProfitPnL Journal
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-ink2/50 p-5 text-xs leading-relaxed text-dim print:border-zinc-300 print:bg-white print:text-zinc-700">
              <p>
                This certificate is a snapshot generated from trade records stored in ProfitPnL at the time of issue. It is not a broker statement and should not be interpreted as financial advice, audited performance, or a guarantee of future results.
              </p>
              <p className="mt-2 break-all font-mono2">
                Verification hash: {certificate.certificate_hash.slice(0, 18)}…{certificate.certificate_hash.slice(-12)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <CertificateActions url={url} title={certificate.title} />
        </div>

        <div className="mt-10 text-center print:hidden">
          <Link href="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline">
            Create your own ProfitPnL certificate free <ExternalLink size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
