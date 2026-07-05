import Link from "next/link";
import type { ReactNode } from "react";

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/risk-disclaimer", label: "Risk Disclaimer" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/contact", label: "Contact" },
];

export function LegalShell({
  eyebrow = "Legal",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 trading-grid opacity-25" />
      <div className="pointer-events-none fixed left-1/2 top-[-220px] -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-gold/10 blur-[140px]" />

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

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-9">
          <p className="mb-3 font-mono2 text-xs uppercase tracking-[0.3em] text-gold">{"//"} {eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted2 sm:text-lg">{description}</p>
          <p className="mt-4 font-mono2 text-xs text-dim">Last updated: July 5, 2026</p>
        </div>

        <article className="profit-card legal-content space-y-8 p-5 leading-relaxed text-muted2 sm:p-8">
          {children}
        </article>

        <section className="mt-10 rounded-2xl border border-line bg-panel/40 p-5">
          <h2 className="font-mono2 text-xs font-bold uppercase tracking-widest text-txt/70">Legal pages</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-line px-3 py-2 text-sm text-muted2 transition-colors hover:border-gold/50 hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 bg-ink2/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="font-mono2 text-xs text-dim">© {new Date().getFullYear()} ProfitPnL. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-dim">
            {legalLinks.slice(0, 5).map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-gold">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-txt">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted2">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
