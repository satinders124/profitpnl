import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function fmtSigned(value: number, suffix = "", digits = 2) {
  return `${value >= 0 ? "+" : ""}${fmtNumber(value, digits)}${suffix}`;
}

function fmtCurrency(value: number | null, currency: string) {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function fmtPlainCurrency(value: number | null, currency: string) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function toneClass(tone: "bull" | "bear" | "gold" | "neutral") {
  if (tone === "bull") return "text-bull";
  if (tone === "bear") return "text-bear";
  if (tone === "gold") return "text-gold";
  return "text-txt print:text-black";
}

function HeroMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "bull" | "bear" | "gold" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-line/80 bg-ink2/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] print:border-zinc-300 print:bg-white print:shadow-none">
      <p className="font-mono2 text-[10px] uppercase tracking-[0.22em] text-dim print:text-zinc-500">{label}</p>
      <p className={`mt-2 font-mono2 text-2xl font-black tracking-tight sm:text-3xl ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "bull" | "bear" | "gold" | "neutral" }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-line/70 py-3 last:border-b-0 print:border-zinc-200">
      <span className="text-sm text-muted2 print:text-zinc-600">{label}</span>
      <span className={`text-right font-mono2 text-sm font-bold ${toneClass(tone)}`}>{value}</span>
    </div>
  );
}

function CertificateNotFound() {
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

export default async function PublicCertificatePage({ params }: PageProps) {
  const { publicId } = await params;
  const certificate = await getCertificate(publicId);

  if (!certificate) return <CertificateNotFound />;

  const verified = isCertificateSignatureValid(certificate);
  const url = `${SITE_URL}/cert/${certificate.public_id}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 200,
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
  const certificateId = displayCertificateId(certificate.public_id);
  const issuedDate = new Date(certificate.created_at);
  const issuedLabel = issuedDate.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const primaryPnlValue = privacy.showDollarPnl
    ? fmtCurrency(metrics.netPnl, metrics.currency)
    : privacy.showReturnPercent && metrics.returnPercent !== null
      ? fmtSigned(metrics.returnPercent * 100, "%", 2)
      : fmtSigned(metrics.totalR, "R", 2);

  const primaryPnlTone = (metrics.netPnl ?? metrics.returnPercent ?? metrics.totalR) >= 0 ? "bull" : "bear";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: certificate.title,
    identifier: certificateId,
    dateCreated: certificate.created_at,
    creator: { "@type": "Organization", name: "ProfitPnL" },
    url,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased print:bg-white print:text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pointer-events-none fixed inset-0 -z-10 trading-grid opacity-30 print:hidden" />
      <div className="pointer-events-none fixed left-1/2 top-[-180px] -z-10 h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-gold/12 blur-[150px] print:hidden" />

      <header className="border-b border-line/60 bg-ink/80 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ProfitPnL" className="h-8 w-auto" />
          </Link>
          <Link href="/register" className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink shadow-[0_0_24px_rgba(240,180,41,0.3)]">
            Create Yours Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 print:max-w-none print:p-0">
        <div className="mb-7 text-center print:hidden">
          <p className="font-mono2 text-xs uppercase tracking-[0.32em] text-gold">Verified Trading Snapshot</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Trading Performance Certificate</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted2">
            A public, immutable performance snapshot generated from ProfitPnL journal records at the time of issue.
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[34px] border border-gold/40 bg-[#11111d] shadow-[0_35px_120px_rgba(0,0,0,0.45),0_0_90px_rgba(240,180,41,0.12)] print:rounded-none print:border-2 print:border-black print:bg-white print:shadow-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(240,180,41,0.16),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(240,180,41,0.10),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_45%)] print:hidden" />
          <div className="absolute inset-x-0 top-0 h-1.5 gold-gradient" />
          <div className="absolute bottom-8 right-8 hidden text-[150px] font-black leading-none text-gold/[0.035] lg:block print:text-zinc-100">
            PPNL
          </div>

          <div className="relative p-5 sm:p-8 lg:p-10 print:p-8">
            <div className="rounded-[28px] border border-line/80 bg-ink/45 p-5 backdrop-blur-sm print:border-zinc-300 print:bg-white sm:p-7 lg:p-8">
              <div className="flex flex-col gap-6 border-b border-line/70 pb-6 lg:flex-row lg:items-start lg:justify-between print:border-zinc-300">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 text-gold shadow-[0_0_45px_rgba(240,180,41,0.18)] print:border-black print:bg-white print:text-black print:shadow-none">
                    <Award size={31} />
                  </div>
                  <div>
                    <p className="font-mono2 text-[11px] uppercase tracking-[0.32em] text-gold print:text-zinc-600">
                      ProfitPnL verified snapshot
                    </p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-txt sm:text-4xl print:text-black">
                      Certificate of Trading Performance
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted2 print:text-zinc-700">
                      This certifies that the trading performance below was calculated from journal records stored in ProfitPnL and locked as a signed snapshot.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-line/80 bg-ink2/75 p-4 print:border-zinc-300 print:bg-white">
                  <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${verified ? "border-bull/30 bg-bull/10 text-bull" : "border-bear/30 bg-bear/10 text-bear"}`}>
                    {verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {verified ? "Signature Verified" : "Signature Invalid"}
                  </span>
                  <p className="text-center font-mono2 text-[11px] text-dim print:text-zinc-500">{certificateId}</p>
                </div>
              </div>

              <div className="grid gap-7 py-8 lg:grid-cols-[1fr_320px] print:grid-cols-[1fr_260px]">
                <div>
                  <div className="rounded-[26px] border border-gold/30 bg-gradient-to-br from-gold/12 via-panel/80 to-ink2/70 p-6 print:border-zinc-300 print:bg-white">
                    <p className="font-mono2 text-[11px] uppercase tracking-[0.28em] text-dim print:text-zinc-500">Issued to</p>
                    <h3 className="mt-3 text-4xl font-black tracking-tight text-txt sm:text-6xl print:text-black">{traderName}</h3>
                    <div className="mt-5 grid gap-3 text-sm text-muted2 sm:grid-cols-3 print:text-zinc-700">
                      <div>
                        <span className="block font-mono2 text-[10px] uppercase tracking-widest text-dim">Account</span>
                        <span className="mt-1 block font-semibold text-txt print:text-black">{accountName}</span>
                      </div>
                      <div>
                        <span className="block font-mono2 text-[10px] uppercase tracking-widest text-dim">Period</span>
                        <span className="mt-1 block font-semibold text-txt print:text-black">{formatDateRange(certificate.period_start, certificate.period_end)}</span>
                      </div>
                      <div>
                        <span className="block font-mono2 text-[10px] uppercase tracking-widest text-dim">Issued</span>
                        <span className="mt-1 block font-semibold text-txt print:text-black">{issuedLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <HeroMetric label={privacy.showDollarPnl ? "Net P&L" : "Primary Result"} value={primaryPnlValue} tone={primaryPnlTone} />
                    <HeroMetric label="Win Rate" value={`${(metrics.winRate * 100).toFixed(1)}%`} tone="gold" />
                    <HeroMetric label="Profit Factor" value={metrics.profitFactor >= 99 ? "∞" : fmtNumber(metrics.profitFactor, 2)} tone={metrics.profitFactor >= 1 ? "bull" : "bear"} />
                    <HeroMetric label="Trades" value={String(metrics.tradeCount)} />
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-line/80 bg-ink2/65 p-5 print:border-zinc-300 print:bg-white">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-txt print:text-black">
                        <Sparkles size={15} className="text-gold" /> Performance Summary
                      </h4>
                      {privacy.showReturnPercent ? (
                        <DetailRow label="Return" value={metrics.returnPercent === null ? "—" : fmtSigned(metrics.returnPercent * 100, "%", 2)} tone={(metrics.returnPercent || 0) >= 0 ? "bull" : "bear"} />
                      ) : null}
                      {privacy.showDollarPnl ? (
                        <>
                          <DetailRow label="Best trade" value={fmtPlainCurrency(metrics.bestTradePnl, metrics.currency)} tone="bull" />
                          <DetailRow label="Worst trade" value={fmtPlainCurrency(metrics.worstTradePnl, metrics.currency)} tone="bear" />
                          <DetailRow label="P&L drawdown" value={fmtPlainCurrency(metrics.maxDrawdownPnl, metrics.currency)} tone="bear" />
                        </>
                      ) : null}
                      <DetailRow label="Wins / Losses / BE" value={`${metrics.wins} / ${metrics.losses} / ${metrics.breakeven}`} />
                      <DetailRow label="Best setup" value={metrics.bestSetup || "—"} tone="gold" />
                    </div>

                    <div className="rounded-2xl border border-line/80 bg-ink2/65 p-5 print:border-zinc-300 print:bg-white">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-txt print:text-black">
                        <ShieldCheck size={15} className="text-bull" /> Risk & R-Multiple
                      </h4>
                      {privacy.showRMetrics ? (
                        <>
                          <DetailRow label="Total R" value={fmtSigned(metrics.totalR, "R", 2)} tone={metrics.totalR >= 0 ? "bull" : "bear"} />
                          <DetailRow label="Average R" value={fmtSigned(metrics.averageR, "R", 2)} tone={metrics.averageR >= 0 ? "bull" : "bear"} />
                          <DetailRow label="Max drawdown" value={`-${fmtNumber(metrics.maxDrawdownR, 2)}R`} tone="bear" />
                          <DetailRow label="Best / Worst R" value={`${fmtSigned(metrics.bestTradeR, "R", 2)} / ${fmtSigned(metrics.worstTradeR, "R", 2)}`} />
                          <DetailRow label="Avg win / Avg loss" value={`${fmtNumber(metrics.avgWinR, 2)}R / ${fmtNumber(metrics.avgLossR, 2)}R`} />
                        </>
                      ) : (
                        <p className="py-6 text-sm text-muted2 print:text-zinc-600">R-multiple metrics were hidden by the trader.</p>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="rounded-[26px] border border-line/80 bg-ink2/75 p-5 print:border-zinc-300 print:bg-white">
                  <div className="rounded-2xl border border-gold/25 bg-gold/10 p-4 text-center print:border-zinc-300 print:bg-white">
                    <p className="font-mono2 text-[10px] uppercase tracking-[0.24em] text-gold print:text-zinc-600">Scan to verify</p>
                    <div className="mx-auto mt-3 w-fit rounded-2xl border border-line bg-white p-3 print:border-zinc-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="Certificate QR code" className="h-40 w-40 print:h-32 print:w-32" />
                    </div>
                    <p className="mt-3 break-all font-mono2 text-[10px] leading-relaxed text-dim print:text-zinc-500">{url}</p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-line bg-ink/60 p-4 print:border-zinc-300 print:bg-white">
                      <p className="font-mono2 text-[10px] uppercase tracking-widest text-dim">Verification status</p>
                      <p className={`mt-2 flex items-center gap-2 text-sm font-bold ${verified ? "text-bull" : "text-bear"}`}>
                        {verified ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {verified ? "Valid signed snapshot" : "Invalid signature"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-line bg-ink/60 p-4 print:border-zinc-300 print:bg-white">
                      <p className="font-mono2 text-[10px] uppercase tracking-widest text-dim">Data source</p>
                      <p className="mt-2 text-sm font-bold text-txt print:text-black">ProfitPnL Journal</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-ink/60 p-4 print:border-zinc-300 print:bg-white">
                      <p className="font-mono2 text-[10px] uppercase tracking-widest text-dim">Hash</p>
                      <p className="mt-2 break-all font-mono2 text-[11px] leading-relaxed text-muted2 print:text-zinc-700">
                        {certificate.certificate_hash.slice(0, 24)}…{certificate.certificate_hash.slice(-18)}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="grid gap-5 border-t border-line/70 pt-6 lg:grid-cols-[1fr_1fr_1.25fr] print:border-zinc-300">
                <div>
                  <p className="font-mono2 text-[10px] uppercase tracking-widest text-dim">Authorized snapshot</p>
                  <div className="mt-5 h-px bg-gradient-to-r from-gold via-gold/70 to-transparent print:bg-zinc-400" />
                  <p className="mt-2 text-sm font-bold text-txt print:text-black">ProfitPnL Verification Engine</p>
                </div>
                <div>
                  <p className="font-mono2 text-[10px] uppercase tracking-widest text-dim">Certificate holder</p>
                  <div className="mt-5 h-px bg-gradient-to-r from-gold via-gold/70 to-transparent print:bg-zinc-400" />
                  <p className="mt-2 text-sm font-bold text-txt print:text-black">{traderName}</p>
                </div>
                <div className="rounded-2xl border border-line/80 bg-ink2/55 p-4 text-xs leading-relaxed text-dim print:border-zinc-300 print:bg-white print:text-zinc-700">
                  This certificate is a journal-verified snapshot, not a broker statement, audit, financial advice, or guarantee of future results. Trading involves risk.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 print:hidden">
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
