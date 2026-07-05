import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { PROP_FIRMS } from "@/lib/growth/prop-firms";
import { ResourceShell } from "@/components/resources/ResourceShell";

const title = "Prop Firm Rules Database";
const description = "Compare prop firm challenge rules, drawdown limits, daily loss rules, profit targets, and risk tips for FTMO, Topstep, Apex, FundedNext, and The5ers.";
export const metadata: Metadata = { title: `${title} | ProfitPnL`, description, alternates: { canonical: "/prop-firm-rules" } };

export default function Page() {
  return (
    <ResourceShell title={title} description={description}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PROP_FIRMS.map((firm) => (
          <Link key={firm.slug} href={`/prop-firm-rules/${firm.slug}`} className="profit-card group flex h-full flex-col p-5 transition-colors hover:border-gold/50">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold"><ShieldAlert size={21} /></div>
            <h2 className="mt-4 text-xl font-bold text-txt">{firm.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted2">{firm.audience}</p>
            <p className="mt-4 font-mono2 text-[11px] text-dim">Target: {firm.profitTarget}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold">View rules <ArrowRight size={14} className="group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </div>
    </ResourceShell>
  );
}
