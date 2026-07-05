import assert from "node:assert/strict";
import {
  calculateCertificateMetrics,
  displayCertificateId,
  generatePublicId,
  isCertificateSignatureValid,
  normalizePrivacy,
  signCertificate,
} from "../lib/certificates.ts";

const trades = [
  { id: "1", date: "2026-07-01", instrument: "NQ", direction: "LONG", result: 2, pnl: 400, account: "Funded" },
  { id: "2", date: "2026-07-02", instrument: "ES", direction: "SHORT", result: -1, pnl: -200, account: "Funded" },
  { id: "3", date: "2026-07-03", instrument: "XAUUSD", direction: "LONG", result: 0.5, pnl: 100, account: "Funded" },
];

const metrics = calculateCertificateMetrics(trades, 10000, "USD");
assert.equal(metrics.tradeCount, 3);
assert.equal(metrics.wins, 2);
assert.equal(metrics.losses, 1);
assert.equal(metrics.netPnl, 300);
assert.equal(metrics.returnPercent, 0.03);
assert.equal(metrics.totalR, 1.5);
assert.equal(metrics.averageR, 0.5);
assert.equal(metrics.maxDrawdownR, 1);
assert.equal(metrics.maxDrawdownPnl, 200);

const publicId = generatePublicId();
assert.ok(publicId.startsWith("cert_"));
assert.ok(displayCertificateId(publicId).startsWith("PPNL-"));

const privacy = normalizePrivacy({ showDollarPnl: false });
assert.equal(privacy.showDollarPnl, false);
assert.equal(privacy.showDisplayName, true);

const snapshotWithoutHash = {
  public_id: publicId,
  user_id: "00000000-0000-0000-0000-000000000000",
  account_name: "Funded",
  title: "July Certificate",
  display_name: "Trader",
  is_anonymous: false,
  status: "active",
  data_source: "journal",
  period_start: "2026-07-01",
  period_end: "2026-07-31",
  metrics,
  privacy,
  created_at: "2026-07-05T00:00:00.000Z",
  revoked_at: null,
};

const certificate_hash = signCertificate(snapshotWithoutHash);
assert.equal(certificate_hash.length, 64);
assert.equal(isCertificateSignatureValid({ ...snapshotWithoutHash, certificate_hash }), true);

// Simulate Supabase jsonb returning nested keys in a different order and
// timestamptz returning "+00:00" instead of "Z". The signature must still pass.
const dbRoundTripSnapshot = {
  ...snapshotWithoutHash,
  created_at: "2026-07-05T00:00:00+00:00",
  privacy: {
    showRMetrics: privacy.showRMetrics,
    showReturnPercent: privacy.showReturnPercent,
    showAccountName: privacy.showAccountName,
    showDollarPnl: privacy.showDollarPnl,
    showDisplayName: privacy.showDisplayName,
  },
  metrics: {
    currency: metrics.currency,
    startingBalance: metrics.startingBalance,
    bestSetup: metrics.bestSetup,
    avgLossR: metrics.avgLossR,
    avgWinR: metrics.avgWinR,
    worstTradePnl: metrics.worstTradePnl,
    bestTradePnl: metrics.bestTradePnl,
    maxDrawdownPnl: metrics.maxDrawdownPnl,
    returnPercent: metrics.returnPercent,
    netPnl: metrics.netPnl,
    worstTradeR: metrics.worstTradeR,
    bestTradeR: metrics.bestTradeR,
    maxDrawdownR: metrics.maxDrawdownR,
    profitFactor: metrics.profitFactor,
    averageR: metrics.averageR,
    totalR: metrics.totalR,
    winRate: metrics.winRate,
    breakeven: metrics.breakeven,
    losses: metrics.losses,
    wins: metrics.wins,
    tradeCount: metrics.tradeCount,
  },
};
assert.equal(isCertificateSignatureValid({ ...dbRoundTripSnapshot, certificate_hash }), true);
assert.equal(isCertificateSignatureValid({ ...snapshotWithoutHash, title: "Tampered", certificate_hash }), false);

console.log("Certificate tests passed.");
