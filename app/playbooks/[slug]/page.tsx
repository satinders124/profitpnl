import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaybook, PLAYBOOKS } from "@/lib/growth/playbooks";
import { GuideSection, ResourceShell } from "@/components/resources/ResourceShell";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return PLAYBOOKS.map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const p = getPlaybook(slug); if (!p) return {}; return { title: `${p.name} Trading Playbook Template | ProfitPnL`, description: p.summary, alternates: { canonical: `/playbooks/${p.slug}` } }; }
export default async function Page({ params }: Props) {
  const { slug } = await params; const p = getPlaybook(slug); if (!p) notFound();
  return <ResourceShell title={`${p.name} Playbook`} description={p.summary}>
    <div className="space-y-6">
      <GuideSection title="Market context"><p>{p.context}</p><p><strong className="text-txt">Market:</strong> {p.market} · <strong className="text-txt">Difficulty:</strong> {p.difficulty}</p></GuideSection>
      <GuideSection title="Entry rules"><ol className="list-decimal space-y-2 pl-5">{p.entryRules.map((r) => <li key={r}>{r}</li>)}</ol></GuideSection>
      <GuideSection title="Invalidation"><ul className="list-disc space-y-2 pl-5">{p.invalidation.map((r) => <li key={r}>{r}</li>)}</ul></GuideSection>
      <GuideSection title="Targets"><ul className="list-disc space-y-2 pl-5">{p.targets.map((r) => <li key={r}>{r}</li>)}</ul></GuideSection>
      <GuideSection title="Mistakes to avoid"><ul className="list-disc space-y-2 pl-5">{p.mistakes.map((r) => <li key={r}>{r}</li>)}</ul></GuideSection>
      <GuideSection title="Journal tags"><p>{p.journalTags.join(", ")}</p></GuideSection>
    </div>
  </ResourceShell>;
}
