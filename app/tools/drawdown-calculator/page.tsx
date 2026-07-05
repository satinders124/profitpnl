import type { Metadata } from "next";
import DrawdownCalculatorClient from "./DrawdownCalculatorClient";

const TITLE = "Trading Drawdown Calculator — Free Drawdown & Recovery Tool | ProfitPnL";
const DESCRIPTION =
  "Free trading drawdown calculator. Enter starting balance, equity peak, and current balance to calculate drawdown percentage, dollar drawdown, and recovery required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/drawdown-calculator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tools/drawdown-calculator", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Trading Drawdown Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/drawdown-calculator",
};

export default function DrawdownCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <DrawdownCalculatorClient />
    </>
  );
}
