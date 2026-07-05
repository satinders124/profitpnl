import type { Metadata } from "next";
import ExpectancyCalculatorClient from "./ExpectancyCalculatorClient";

const TITLE = "Trading Expectancy Calculator — Free Edge & Profitability Tool | ProfitPnL";
const DESCRIPTION =
  "Free trading expectancy calculator. Enter win rate, average win, and average loss to calculate expectancy per trade, profit factor, and break-even win rate.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/expectancy-calculator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tools/expectancy-calculator", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Trading Expectancy Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/expectancy-calculator",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is trading expectancy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Trading expectancy is the average amount a strategy is expected to make or lose per trade based on win rate, average win, and average loss.",
      },
    },
    {
      "@type": "Question",
      name: "Can a low win rate strategy be profitable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. A strategy can be profitable with a low win rate if average winners are large enough compared with average losers.",
      },
    },
  ],
};

export default function ExpectancyCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <ExpectancyCalculatorClient />
    </>
  );
}
