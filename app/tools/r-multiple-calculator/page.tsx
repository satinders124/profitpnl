import type { Metadata } from "next";
import RMultipleCalculatorClient from "./RMultipleCalculatorClient";

const TITLE = "R-Multiple Calculator — Free Trading R Calculator | ProfitPnL";
const DESCRIPTION =
  "Free R-multiple calculator for traders. Enter entry, stop-loss, exit price, and optional risk amount to calculate realized R and dollar result.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/r-multiple-calculator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tools/r-multiple-calculator", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "R-Multiple Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
  url: "https://profitpnl.com/tools/r-multiple-calculator",
};

export default function RMultipleCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <RMultipleCalculatorClient />
    </>
  );
}
