import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { GuideSection, ResourceShell } from "@/components/resources/ResourceShell";

const title = "Free Trading Journal CSV Templates";
const description =
  "Download free trading journal CSV templates for forex, futures, crypto, prop-firm trading, and psychology review. Built to help traders start journaling cleanly.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/csv-templates" },
  openGraph: { title: `${title} | ProfitPnL`, description, url: "/csv-templates", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

const templates = [
  {
    title: "ProfitPnL Trade Journal Template",
    description: "General-purpose CSV for forex, futures, crypto, indices, and prop-firm traders.",
    href: "/templates/profitpnl-trade-journal-template.csv",
    file: "profitpnl-trade-journal-template.csv",
    bestFor: "All traders",
  },
  {
    title: "Forex Trading Journal Template",
    description: "CSV example focused on forex pairs and metals like EURUSD and XAUUSD.",
    href: "/templates/profitpnl-forex-journal-template.csv",
    file: "profitpnl-forex-journal-template.csv",
    bestFor: "Forex / Gold",
  },
  {
    title: "Futures Trading Journal Template",
    description: "CSV example for ES, NQ, micros, session tagging, and execution review.",
    href: "/templates/profitpnl-futures-journal-template.csv",
    file: "profitpnl-futures-journal-template.csv",
    bestFor: "Futures",
  },
  {
    title: "Crypto Trading Journal Template",
    description: "CSV example for BTCUSD, ETHUSD, 24/7 sessions, and routine discipline.",
    href: "/templates/profitpnl-crypto-journal-template.csv",
    file: "profitpnl-crypto-journal-template.csv",
    bestFor: "Crypto",
  },
  {
    title: "Psychology Review Template",
    description: "Separate review sheet for mood, confidence, mistakes, discipline, and next-session focus.",
    href: "/templates/profitpnl-psychology-review-template.csv",
    file: "profitpnl-psychology-review-template.csv",
    bestFor: "Mindset review",
  },
];

const columns = [
  ["date", "Trade date in YYYY-MM-DD format."],
  ["time", "Trade time or approximate execution time."],
  ["instrument", "Market traded, e.g. EURUSD, NQ, ES, BTCUSD, XAUUSD."],
  ["direction", "LONG or SHORT."],
  ["setup", "Your playbook/setup name."],
  ["session", "London, New York, Asia, premarket, etc."],
  ["timeframe", "Chart timeframe used for the setup."],
  ["emotion", "How you felt before/during entry."],
  ["entry, sl, tp", "Entry price, stop-loss price, and take-profit price."],
  ["rr", "Planned risk-reward ratio."],
  ["result", "Trade result in R-multiple, e.g. 2.5 or -1."],
  ["pnl", "Profit/loss in account currency if tracked."],
  ["account", "Trading account or prop-firm account name."],
  ["notes", "Trade context, execution notes, and screenshots/links if needed."],
  ["tags", "Comma-separated tags like A+, FOMO, discipline."],
  ["reviewed", "true or false."],
  ["execution_rating", "1 to 5 rating for execution quality."],
  ["mistake", "Mistake label if rules were broken."],
  ["lesson", "One concrete takeaway from the trade."],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Free Trading Journal CSV Templates",
  description,
  itemListElement: templates.map((template, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: template.title,
    url: `https://profitpnl.com${template.href}`,
    description: template.description,
  })),
};

export default function CsvTemplatesPage() {
  return (
    <ResourceShell
      title={title}
      description={description}
      cta={
        <div className="flex flex-wrap gap-3">
          <a href="/templates/profitpnl-trade-journal-template.csv" download className="gold-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-ink">
            <Download size={16} /> Download Main Template
          </a>
          <Link href="/journaling-guides" className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-bold text-txt transition-colors hover:border-gold/50 hover:text-gold">
            Read Journaling Guide
          </Link>
        </div>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div key={template.href} className="profit-card flex h-full flex-col p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <FileSpreadsheet size={21} />
            </div>
            <p className="mt-4 font-mono2 text-[11px] uppercase tracking-widest text-gold">{template.bestFor}</p>
            <h2 className="mt-2 text-lg font-bold text-txt">{template.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted2">{template.description}</p>
            <p className="mt-4 truncate rounded-lg border border-line bg-ink2/70 px-3 py-2 font-mono2 text-[11px] text-dim">{template.file}</p>
            <a href={template.href} download className="gold-gradient mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-ink">
              Download CSV <Download size={15} />
            </a>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <GuideSection title="CSV column guide">
            <p>
              These templates use clean, simple column names so you can start journaling immediately in Google Sheets, Excel, Notion, Airtable, or your own workflow.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-ink2 text-xs uppercase tracking-widest text-dim">
                  <tr>
                    <th className="border-b border-line px-4 py-3">Column</th>
                    <th className="border-b border-line px-4 py-3">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map(([column, purpose]) => (
                    <tr key={column} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-3 font-mono2 text-gold">{column}</td>
                      <td className="px-4 py-3 text-muted2">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GuideSection>

          <GuideSection title="How to use the templates">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Download the template that matches your market.</li>
              <li>Open it in Google Sheets, Excel, or Numbers.</li>
              <li>Duplicate the sample rows and replace them with your own trades.</li>
              <li>Keep setup names and mistake tags consistent so your data stays useful.</li>
              <li>Review your journal weekly and look for patterns, not single-trade emotions.</li>
            </ol>
          </GuideSection>

          <GuideSection title="When to move beyond CSV">
            <p>
              CSV templates are perfect for getting started, but manual spreadsheets become painful once you need account filters, certificates, AI coaching, drawdown tracking, and performance breakdowns by setup/session/instrument.
            </p>
            <p>
              ProfitPnL is built to automate that workflow after you understand the fields you want to track.
            </p>
          </GuideSection>
        </div>

        <aside className="space-y-4">
          <div className="profit-card sticky top-24 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-bull/10 text-bull">
              <ShieldCheck size={21} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-txt">Template best practice</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted2">
              Do not overcomplicate your first journal. Consistency beats having 80 columns you never fill out.
            </p>
            <Link href="/register" className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-gold/40 px-4 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/10">
              Automate in ProfitPnL
            </Link>
          </div>
        </aside>
      </div>
    </ResourceShell>
  );
}
