import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROP_FIRMS, getPropFirm } from "@/lib/growth/prop-firms";
import { GuideSection, ResourceShell } from "@/components/resources/ResourceShell";

type Props = { params: Promise<{ firm: string }> };
export function generateStaticParams() { return PROP_FIRMS.map((firm) => ({ firm: firm.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { firm: slug } = await params;
  const firm = getPropFirm(slug);
  if (!firm) return {};
  const title = `${firm.name} Rules, Drawdown & Challenge Calculator | ProfitPnL`;
  const description = `Educational overview of ${firm.name} prop firm rules, profit targets, daily loss limits, drawdown, consistency notes, and risk tips.`;
  return { title, description, alternates: { canonical: `/prop-firm-rules/${firm.slug}` } };
}

export default async function Page({ params }: Props) {
  const { firm: slug } = await params;
  const firm = getPropFirm(slug);
  if (!firm) notFound();
  return (
    <ResourceShell title={`${firm.name} Rules & Risk Guide`} description={`Educational rule overview and risk planning notes for ${firm.name}. Always verify current rules directly with the firm before trading.`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <GuideSection title="Rule snapshot">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-txt">Markets:</strong> {firm.markets}</li>
              <li><strong className="text-txt">Account examples:</strong> {firm.accountExamples}</li>
              <li><strong className="text-txt">Profit target:</strong> {firm.profitTarget}</li>
              <li><strong className="text-txt">Max drawdown:</strong> {firm.maxDrawdown}</li>
              <li><strong className="text-txt">Daily loss:</strong> {firm.dailyLoss}</li>
            </ul>
          </GuideSection>
          <GuideSection title="Payout, news, and consistency notes">
            <p><strong className="text-txt">Payout:</strong> {firm.payoutNotes}</p>
            <p><strong className="text-txt">News:</strong> {firm.newsRules}</p>
            <p><strong className="text-txt">Consistency:</strong> {firm.consistencyRules}</p>
          </GuideSection>
          <GuideSection title="ProfitPnL risk tip">
            <p>{firm.keyRiskTip}</p>
          </GuideSection>
        </div>
        <aside className="profit-card h-fit p-5 lg:sticky lg:top-24">
          <p className="font-mono2 text-xs uppercase tracking-widest text-gold">Calculator preset</p>
          <h2 className="mt-3 text-lg font-bold text-txt">Plan your challenge</h2>
          <p className="mt-2 text-sm text-muted2">Use our prop calculator and simulator with {firm.name}-style assumptions.</p>
          <Link href="/tools/prop-firm-challenge-calculator" className="gold-gradient mt-4 inline-flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-ink">Challenge Calculator</Link>
          <Link href="/tools/prop-firm-survival-simulator" className="mt-3 inline-flex w-full justify-center rounded-xl border border-gold/40 px-4 py-3 text-sm font-bold text-gold">Survival Simulator</Link>
        </aside>
      </div>
    </ResourceShell>
  );
}
