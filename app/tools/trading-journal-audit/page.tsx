import type { Metadata } from "next";
import TradingJournalAuditClient from "./TradingJournalAuditClient";

const title = "AI Trading Journal Audit — Free Trade Performance Analyzer | ProfitPnL";
const description = "Upload or paste a trading journal CSV and get an instant edge score, performance audit, leaks, strengths, and action plan. Free, private, and no sign-up required.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools/trading-journal-audit" },
  openGraph: { title, description, url: "/tools/trading-journal-audit", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function Page() {
  return <TradingJournalAuditClient />;
}
