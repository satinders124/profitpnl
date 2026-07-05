import type { Metadata } from "next";
import { TRADING_METRICS } from "@/lib/growth/metrics";
import { ResourceCard, ResourceShell } from "@/components/resources/ResourceShell";
const title = "Trading Metrics Glossary";
const description = "Learn key trading journal metrics: win rate, profit factor, expectancy, R-multiple, max drawdown, and risk of ruin.";
export const metadata: Metadata = { title: `${title} | ProfitPnL`, description, alternates: { canonical: "/trading-metrics" } };
export default function Page() { return <ResourceShell title={title} description={description}><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{TRADING_METRICS.map((m) => <ResourceCard key={m.slug} title={m.name} description={m.plainEnglish} href={`/trading-metrics/${m.slug}`} meta="Metric guide" />)}</div></ResourceShell>; }
