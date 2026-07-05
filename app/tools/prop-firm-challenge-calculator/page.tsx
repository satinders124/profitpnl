import type { Metadata } from "next";
import PropFirmChallengeCalculatorClient from "./PropFirmChallengeCalculatorClient";

const TITLE = "Prop Firm Challenge Calculator — Free Target & Drawdown Tool | ProfitPnL";
const DESCRIPTION =
  "Free prop firm challenge calculator. Track profit target, remaining profit, daily loss limit, max drawdown buffer, and required average daily profit.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/prop-firm-challenge-calculator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tools/prop-firm-challenge-calculator", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Prop Firm Challenge Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/prop-firm-challenge-calculator",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does this prop firm calculator track?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It estimates profit target progress, remaining profit needed, max drawdown buffer, daily loss limit, and average daily profit needed to reach the target.",
      },
    },
    {
      "@type": "Question",
      name: "Does this support every prop firm rule?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It uses a simple static drawdown model. Always check your prop firm dashboard and exact rules because trailing and end-of-day drawdown methods can differ.",
      },
    },
  ],
};

export default function PropFirmChallengeCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PropFirmChallengeCalculatorClient />
    </>
  );
}
