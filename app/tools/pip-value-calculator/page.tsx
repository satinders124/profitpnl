import type { Metadata } from "next";
import PipValueCalculatorClient from "./PipValueCalculatorClient";

const TITLE = "Pip Value Calculator — Free Forex & Futures Tick Value Tool | ProfitPnL";
const DESCRIPTION =
  "Free pip value and tick value calculator for forex, gold, crypto, indices, and futures. Convert pips or ticks into account-currency value instantly. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/pip-value-calculator" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/tools/pip-value-calculator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pip Value Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/pip-value-calculator",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is pip value?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pip value is the amount of money gained or lost when price moves by one pip for a given lot size.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between a pip and a tick?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pip is common forex terminology. Tick is common futures terminology. Both describe the price increment used to calculate the value of a move.",
      },
    },
  ],
};

export default function PipValueCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PipValueCalculatorClient />
    </>
  );
}
