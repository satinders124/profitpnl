import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

const resourceLinks = [
  { href: "/journaling-guides", label: "Journaling Guides" },
  { href: "/csv-templates", label: "CSV Templates" },
  { href: "/tools", label: "Free Calculators" },
  { href: "/certificates", label: "Certificates" },
];

export function ResourceShell({
  eyebrow = "Resources",
  title,
  description,
  children,
  cta,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 trading-grid opacity-30" />
      <div className="pointer-events-none fixed left-1/2 top-[-220px] -z-10 h-[660px] w-[660px] -translate-x-1/2 rounded-full bg-gold/10 blur-[150px]" />

      <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="group flex items-center gap-2" aria-label="ProfitPnL home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ProfitPnL" className="h-8 w-auto transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted2 md:flex">
            <Link href="/tools" className="transition-colors hover:text-gold">Tools</Link>
            <Link href="/login" className="transition-colors hover:text-gold">Login</Link>
            <Link href="/register" className="gold-gradient rounded-lg px-4 py-2 font-bold text-ink">Get Started</Link>
          </nav>
          <Link href="/register" className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink md:hidden">
            Start
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="mb-10 max-w-3xl">
          <p className="mb-3 font-mono2 text-xs uppercase tracking-[0.3em] text-gold">{"//"} {eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted2 sm:text-lg">{description}</p>
          {cta ? <div className="mt-6">{cta}</div> : null}
        </section>

        {children}

        <section className="profit-card mt-14 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-txt">Ready to journal faster?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted2">
              Start with the free templates, then move your workflow into ProfitPnL to track your edge automatically.
            </p>
          </div>
          <Link href="/register" className="gold-gradient inline-flex shrink-0 items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-ink">
            Create Free Account <ArrowRight size={15} />
          </Link>
        </section>
      </main>

      <footer className="border-t border-line/60 bg-ink2/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="font-mono2 text-xs text-dim">© {new Date().getFullYear()} ProfitPnL. Trading tools and education only — not financial advice.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-dim">
            {resourceLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-gold">{link.label}</Link>
            ))}
            <Link href="/privacy" className="hover:text-gold">Privacy</Link>
            <Link href="/terms" className="hover:text-gold">Terms</Link>
            <Link href="/risk-disclaimer" className="hover:text-gold">Risk Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ResourceCard({
  title,
  description,
  href,
  meta,
}: {
  title: string;
  description: string;
  href: string;
  meta?: string;
}) {
  return (
    <Link href={href} className="profit-card group flex h-full flex-col p-5 transition-colors hover:border-gold/50">
      {meta ? <p className="mb-3 font-mono2 text-[11px] uppercase tracking-widest text-gold">{meta}</p> : null}
      <h2 className="text-lg font-bold text-txt">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted2">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold">
        Open resource <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="profit-card p-5 sm:p-6">
      <h2 className="text-xl font-bold text-txt">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted2">{children}</div>
    </section>
  );
}
