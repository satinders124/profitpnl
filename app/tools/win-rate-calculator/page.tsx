import type { Metadata } from "next";
import WinRateCalculatorClient from "./WinRateCalculatorClient";

const TITLE = "Trading Win Rate Calculator — Free Win Percentage Tool | ProfitPnL";
const DESCRIPTION =
  "Free trading win rate calculator. Enter wins, losses, and break-even trades to calculate win rate, loss rate, and minimum reward-risk needed to break even.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/win-rate-calculator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tools/win-rate-calculator", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Trading Win Rate Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/win-rate-calculator",
};

export default function WinRateCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <WinRateCalculatorClient />
    </>
  );
}
