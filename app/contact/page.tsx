import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "Contact";
const description = "Contact ProfitPnL for support, privacy requests, billing help, product feedback, partnerships, or general questions.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <LegalShell eyebrow="Support" title={title} description={description}>
      <LegalSection title="Email support">
        <p>
          For support, billing, privacy, partnership, or product questions, email us at:
        </p>
        <p>
          <a className="text-lg font-bold text-gold hover:underline" href="mailto:hello@profitpnl.com">hello@profitpnl.com</a>
        </p>
        <p>
          Please include your account email, a clear description of the issue, screenshots if helpful, and any relevant certificate/trade/account IDs.
        </p>
      </LegalSection>

      <LegalSection title="Common links">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/privacy" className="rounded-xl border border-line bg-ink2/70 p-4 text-sm font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold">Privacy requests</Link>
          <Link href="/refund-policy" className="rounded-xl border border-line bg-ink2/70 p-4 text-sm font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold">Billing and refunds</Link>
          <Link href="/risk-disclaimer" className="rounded-xl border border-line bg-ink2/70 p-4 text-sm font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold">Trading risk questions</Link>
          <Link href="/tools" className="rounded-xl border border-line bg-ink2/70 p-4 text-sm font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold">Free tools</Link>
        </div>
      </LegalSection>

      <LegalSection title="Response times">
        <p>
          We aim to respond as quickly as possible. Response times can vary depending on support volume, weekends, holidays, and issue complexity.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
