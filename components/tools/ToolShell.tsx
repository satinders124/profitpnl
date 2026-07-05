"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const RELATED_TOOLS = [
  { href: "/tools/profit-calculator", label: "Profit Calculator" },
  { href: "/tools/lot-size-calculator", label: "Lot Size Calculator" },
  { href: "/tools/pip-value-calculator", label: "Pip Value Calculator" },
  { href: "/tools/risk-reward-calculator", label: "Risk-Reward Calculator" },
];

export function ToolShell({
  eyebrow,
  title,
  description,
  currentPath,
  children,
  content,
}: {
  eyebrow: string;
  title: string;
  description: string;
  currentPath: string;
  children: ReactNode;
  content?: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 trading-grid opacity-40" />
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />

      <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-center gap-2" aria-label="ProfitPnL home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ProfitPnL" className="h-8 w-auto transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/tools" className="hidden text-sm text-muted2 transition-colors hover:text-gold sm:inline">
              All Tools
            </Link>
            <Link
              href="/register"
              className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink shadow-[0_0_24px_rgba(240,180,41,0.35)] transition-shadow hover:shadow-[0_0_36px_rgba(240,180,41,0.55)]"
            >
              Get the Journal Free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-gold">
          <ArrowLeft size={14} /> All calculators
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 max-w-3xl"
        >
          <p className="mb-3 font-mono2 text-xs uppercase tracking-[0.3em] text-gold">{"//"} {eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted2 sm:text-lg">{description}</p>
          <div className="mt-4 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-panel/70 px-3 py-1 text-xs text-dim">
            <ShieldCheck size={13} className="text-bull" /> Free forever · No sign-up · Browser-based
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
          {children}
        </motion.div>

        {content ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 max-w-3xl space-y-8"
          >
            {content}
          </motion.div>
        ) : null}

        <section className="mt-16 border-t border-line/60 pt-8">
          <h2 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">More free trading calculators</h2>
          <div className="flex flex-wrap gap-2">
            {RELATED_TOOLS.filter((tool) => tool.href !== currentPath).map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-lg border border-line bg-panel/30 px-3 py-2 text-sm text-muted2 transition-colors hover:border-gold/50 hover:text-gold"
              >
                {tool.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="profit-card mt-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-txt">Stop calculating trades one at a time.</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted2">
              ProfitPnL journals every trade and shows your real win rate, R-multiple, expectancy, drawdown, and habits in one dashboard.
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
          <p className="font-mono2 text-xs text-dim">
            © {new Date().getFullYear()} ProfitPnL. Educational tools only — not financial advice. Trading involves risk.
          </p>
        </div>
      </footer>
    </div>
  );
}
