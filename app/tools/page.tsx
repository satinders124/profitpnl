import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Layers, Scale, TrendingUp } from "lucide-react";

const TITLE = "Free Trading Calculators — Profit, Lot Size, Pip Value & Risk-Reward | ProfitPnL";
const DESCRIPTION =
  "Free trading calculators for forex, gold, crypto, indices, and futures traders. Calculate profit, lot size, pip value, and risk-reward ratio with no sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/tools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const tools = [
  {
    href: "/tools/profit-calculator",
    icon: TrendingUp,
    title: "Profit Calculator",
    description: "Calculate exact profit or loss from entry price, exit price, direction, and position size.",
    keywords: "forex profit calculator, futures P&L calculator, crypto profit calculator",
  },
  {
    href: "/tools/lot-size-calculator",
    icon: Layers,
    title: "Lot Size Calculator",
    description: "Find the correct lot size or contract count from account balance, risk %, and stop-loss distance.",
    keywords: "lot size calculator, position size calculator, forex risk calculator",
  },
  {
    href: "/tools/pip-value-calculator",
    icon: Calculator,
    title: "Pip Value Calculator",
    description: "Convert a pip or futures tick into real account-currency value before you place the trade.",
    keywords: "pip value calculator, tick value calculator, ES tick value, NQ tick value",
  },
  {
    href: "/tools/risk-reward-calculator",
    icon: Scale,
    title: "Risk-Reward Calculator",
    description: "Check your setup's R:R ratio and the break-even win rate needed before taking the trade.",
    keywords: "risk reward ratio calculator, R multiple calculator, trading win rate calculator",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Free Trading Calculators",
  description: DESCRIPTION,
  itemListElement: tools.map((tool, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://profitpnl.com${tool.href}`,
    name: tool.title,
    description: tool.description,
  })),
};

export default function ToolsIndexPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pointer-events-none fixed inset-0 -z-10 trading-grid opacity-40" />
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-gold/10 blur-[130px]" />

      <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-center gap-2" aria-label="ProfitPnL home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ProfitPnL" className="h-8 w-auto transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <Link
            href="/register"
            className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink shadow-[0_0_24px_rgba(240,180,41,0.35)] transition-shadow hover:shadow-[0_0_36px_rgba(240,180,41,0.55)]"
          >
            Get the Journal Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <section className="mb-12 max-w-3xl">
          <p className="mb-3 font-mono2 text-xs uppercase tracking-[0.3em] text-gold">{"//"} Free Trading Tools</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Trading calculators for every setup, before you risk a cent.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted2 sm:text-lg">
            Built for traders who need fast position sizing, P&L, pip value, tick value, and risk-reward math across forex, gold, crypto, indices, and futures — no login required.
          </p>
        </section>

        <section className="grid gap-5 sm:grid-cols-2" aria-label="Trading calculators">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} className="profit-card group flex min-h-[230px] flex-col gap-4 p-6 transition-colors hover:border-gold/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <Icon size={21} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-txt">{tool.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted2">{tool.description}</p>
                  <p className="mt-3 font-mono2 text-[11px] leading-relaxed text-dim">Targets: {tool.keywords}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-gold">
                  Open calculator <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </section>

        <section className="profit-card mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-txt">Want these numbers tracked automatically?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted2">
              ProfitPnL turns your actual trade history into win rate, expectancy, R-multiple, drawdown, and execution insights.
            </p>
          </div>
          <Link
            href="/register"
            className="gold-gradient shrink-0 rounded-xl px-6 py-3 text-sm font-bold text-ink shadow-[0_0_28px_rgba(240,180,41,0.4)] transition-shadow hover:shadow-[0_0_40px_rgba(240,180,41,0.6)]"
          >
            Start Journaling Free →
          </Link>
        </section>
      </main>

      <footer className="border-t border-line/60 bg-ink2/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="font-mono2 text-xs text-dim">© {new Date().getFullYear()} ProfitPnL. Educational tools only — not financial advice. Trading involves risk.</p>
        </div>
      </footer>
    </div>
  );
}
