import crypto from "node:crypto";
import type { Trade } from "@/types/trade";
import { calcStats, closedTrades } from "@/lib/stats";

export type CertificatePrivacy = {
  showDisplayName: boolean;
  showDollarPnl: boolean;
  showAccountName: boolean;
  showReturnPercent: boolean;
  showRMetrics: boolean;
};

export type CertificateMetrics = {
  tradeCount: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalR: number;
  averageR: number;
  profitFactor: number;
  maxDrawdownR: number;
  bestTradeR: number;
  worstTradeR: number;
  netPnl: number | null;
  returnPercent: number | null;
  maxDrawdownPnl: number | null;
  bestTradePnl: number | null;
  worstTradePnl: number | null;
  avgWinR: number;
  avgLossR: number;
  bestSetup: string;
  startingBalance: number | null;
  currency: string;
};

export type CertificateSnapshot = {
  public_id: string;
  user_id: string;
  account_name: string | null;
  title: string;
  display_name: string | null;
  is_anonymous: boolean;
  status: "active" | "revoked" | string;
  data_source: "journal" | "csv" | "broker" | string;
  period_start: string;
  period_end: string;
  metrics: CertificateMetrics;
  privacy: CertificatePrivacy;
  certificate_hash: string;
  created_at: string;
  revoked_at?: string | null;
};

type TradeRow = {
  id?: string;
  date?: string | null;
  time?: string | null;
  instrument?: string | null;
  direction?: string | null;
  setup?: string | null;
  session?: string | null;
  timeframe?: string | null;
  emotion?: string | null;
  entry?: number | string | null;
  sl?: number | string | null;
  tp?: number | string | null;
  rr?: number | string | null;
  result?: number | string | null;
  pnl?: number | string | null;
  account?: string | null;
  notes?: string | null;
  tags?: string | null;
  chart_url?: string | null;
  reviewed?: boolean | null;
  execution_rating?: number | string | null;
  mistake?: string | null;
  lesson?: string | null;
  created_at?: string | null;
};

export const DEFAULT_CERTIFICATE_PRIVACY: CertificatePrivacy = {
  showDisplayName: true,
  showDollarPnl: true,
  showAccountName: true,
  showReturnPercent: true,
  showRMetrics: true,
};

export function normalizePrivacy(input?: Partial<CertificatePrivacy> | null): CertificatePrivacy {
  return {
    showDisplayName: input?.showDisplayName ?? DEFAULT_CERTIFICATE_PRIVACY.showDisplayName,
    showDollarPnl: input?.showDollarPnl ?? DEFAULT_CERTIFICATE_PRIVACY.showDollarPnl,
    showAccountName: input?.showAccountName ?? DEFAULT_CERTIFICATE_PRIVACY.showAccountName,
    showReturnPercent: input?.showReturnPercent ?? DEFAULT_CERTIFICATE_PRIVACY.showReturnPercent,
    showRMetrics: input?.showRMetrics ?? DEFAULT_CERTIFICATE_PRIVACY.showRMetrics,
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapTradeRows(rows: TradeRow[]): Trade[] {
  return rows.map((row) => ({
    id: row.id || "",
    date: row.date || "",
    time: row.time || "",
    instrument: row.instrument || "",
    direction: row.direction || "",
    setup: row.setup || "",
    session: row.session || "",
    timeframe: row.timeframe || "",
    emotion: row.emotion || "",
    entry: row.entry ?? "",
    sl: row.sl ?? "",
    tp: row.tp ?? "",
    rr: row.rr ?? "",
    result: row.result ?? null,
    pnl: row.pnl ?? null,
    account: row.account || "",
    notes: row.notes || "",
    tags: row.tags || "",
    chartUrl: row.chart_url || "",
    reviewed: row.reviewed || false,
    executionRating: row.execution_rating ?? "",
    mistake: row.mistake || "",
    lesson: row.lesson || "",
    createdAt: row.created_at,
  }));
}

function pnlSummary(trades: Trade[]) {
  const pnlValues = closedTrades(trades)
    .map((trade) => toNumber(trade.pnl))
    .filter((value): value is number => value !== null);

  if (!pnlValues.length) {
    return {
      netPnl: null,
      maxDrawdownPnl: null,
      bestTradePnl: null,
      worstTradePnl: null,
    };
  }

  let cumulative = 0;
  let peak = 0;
  let maxDrawdownPnl = 0;

  for (const pnl of pnlValues) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    maxDrawdownPnl = Math.max(maxDrawdownPnl, peak - cumulative);
  }

  return {
    netPnl: pnlValues.reduce((sum, pnl) => sum + pnl, 0),
    maxDrawdownPnl,
    bestTradePnl: Math.max(...pnlValues),
    worstTradePnl: Math.min(...pnlValues),
  };
}

export function calculateCertificateMetrics(
  trades: Trade[],
  startingBalance: number | null,
  currency: string
): CertificateMetrics {
  const stats = calcStats(trades);
  const pnl = pnlSummary(trades);
  const returnPercent =
    pnl.netPnl !== null && startingBalance && startingBalance > 0
      ? pnl.netPnl / startingBalance
      : null;

  return {
    tradeCount: stats.count,
    wins: stats.wins,
    losses: stats.losses,
    breakeven: stats.breakeven,
    winRate: stats.winRate,
    totalR: stats.totalR,
    averageR: stats.expectancy,
    profitFactor: stats.profitFactor,
    maxDrawdownR: stats.maxDD,
    bestTradeR: stats.biggestWin,
    worstTradeR: stats.biggestLoss,
    netPnl: pnl.netPnl,
    returnPercent,
    maxDrawdownPnl: pnl.maxDrawdownPnl,
    bestTradePnl: pnl.bestTradePnl,
    worstTradePnl: pnl.worstTradePnl,
    avgWinR: stats.avgWin,
    avgLossR: stats.avgLoss,
    bestSetup: stats.bestSetup,
    startingBalance,
    currency,
  };
}

export function generatePublicId() {
  return `cert_${crypto.randomBytes(9).toString("base64url").toLowerCase()}`;
}

export function displayCertificateId(publicId: string) {
  return `PPNL-${publicId.replace(/^cert_/, "").replace(/_/g, "").toUpperCase()}`;
}

function certificateSecret() {
  return (
    process.env.CERTIFICATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "development-certificate-secret"
  );
}

export function canonicalCertificatePayload(snapshot: Omit<CertificateSnapshot, "certificate_hash">) {
  return JSON.stringify({
    public_id: snapshot.public_id,
    user_id: snapshot.user_id,
    account_name: snapshot.account_name,
    title: snapshot.title,
    display_name: snapshot.display_name,
    is_anonymous: snapshot.is_anonymous,
    status: snapshot.status,
    data_source: snapshot.data_source,
    period_start: snapshot.period_start,
    period_end: snapshot.period_end,
    metrics: snapshot.metrics,
    privacy: snapshot.privacy,
    created_at: snapshot.created_at,
  });
}

export function signCertificate(snapshot: Omit<CertificateSnapshot, "certificate_hash">) {
  return crypto
    .createHmac("sha256", certificateSecret())
    .update(canonicalCertificatePayload(snapshot))
    .digest("hex");
}

export function isCertificateSignatureValid(snapshot: CertificateSnapshot) {
  const expected = signCertificate(snapshot);
  const actual = snapshot.certificate_hash || "";
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function formatDateRange(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} — ${end}`;
  }

  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(startDate)} — ${fmt.format(endDate)}`;
}
