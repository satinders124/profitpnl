import type { Metadata } from "next";
import { PLAYBOOKS } from "@/lib/growth/playbooks";
import { ResourceCard, ResourceShell } from "@/components/resources/ResourceShell";
const title = "Trading Playbook Templates";
const description = "Free educational trading playbook templates for ORB, liquidity sweeps, fair value gaps, break-and-retest, and range fades.";
export const metadata: Metadata = { title: `${title} | ProfitPnL`, description, alternates: { canonical: "/playbooks" } };
export default function Page() { return <ResourceShell title={title} description={description}><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{PLAYBOOKS.map((p) => <ResourceCard key={p.slug} title={p.name} description={p.summary} href={`/playbooks/${p.slug}`} meta={`${p.market} · ${p.difficulty}`} />)}</div></ResourceShell>; }
