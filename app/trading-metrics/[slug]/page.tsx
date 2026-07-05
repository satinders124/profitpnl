import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMetric, TRADING_METRICS } from "@/lib/growth/metrics";
import { GuideSection, ResourceShell } from "@/components/resources/ResourceShell";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return TRADING_METRICS.map((m) => ({ slug: m.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const m = getMetric(slug); if (!m) return {}; return { title: `${m.name} Explained | Trading Metrics | ProfitPnL`, description: m.plainEnglish, alternates: { canonical: `/trading-metrics/${m.slug}` } }; }
export default async function Page({ params }: Props) {
  const { slug } = await params; const m = getMetric(slug); if (!m) notFound();
  return <ResourceShell title={`${m.name} Explained`} description={m.plainEnglish}>
    <div className="space-y-6">
      <GuideSection title="Formula"><p className="rounded-xl border border-line bg-ink2/70 p-4 font-mono2 text-sm text-gold">{m.formula}</p></GuideSection>
      <GuideSection title="Why it matters"><p>{m.whyItMatters}</p></GuideSection>
      <GuideSection title="Example"><p>{m.example}</p></GuideSection>
      {m.relatedTool ? <GuideSection title="Use the calculator"><Link className="text-gold hover:underline" href={m.relatedTool}>Open related ProfitPnL calculator →</Link></GuideSection> : null}
    </div>
  </ResourceShell>;
}
