import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "About ProfitPnL";
const description = "ProfitPnL is a trading journal and analytics platform built to help serious traders review execution, risk, psychology, and performance.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <LegalShell eyebrow="Company" title={title} description={description}>
      <LegalSection title="Our mission">
        <p>
          ProfitPnL exists to help traders stop guessing and start reviewing their performance with real data. Most traders focus only on entries. We believe the real edge comes from tracking risk, execution, setups, psychology, and consistency over time.
        </p>
      </LegalSection>

      <LegalSection title="What we build">
        <p>
          ProfitPnL combines a trading journal, performance analytics, AI-assisted review, public certificates, prop-firm tracking, and free trading calculators into one clean workflow for active traders.
        </p>
      </LegalSection>

      <LegalSection title="Who it is for">
        <p>
          ProfitPnL is designed for forex, futures, indices, crypto, and prop-firm traders who want to understand their numbers and improve execution discipline.
        </p>
      </LegalSection>

      <LegalSection title="Important note">
        <p>
          ProfitPnL is not a broker, investment adviser, or signal provider. We provide tools for journaling, analysis, education, and self-review. Trading decisions remain your responsibility.
        </p>
      </LegalSection>

      <LegalSection title="Get started">
        <p>
          Explore our <Link className="text-gold hover:underline" href="/tools">free trading calculators</Link> or <Link className="text-gold hover:underline" href="/register">create a ProfitPnL account</Link> to start journaling your trades.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
