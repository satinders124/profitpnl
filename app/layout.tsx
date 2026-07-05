import type { Metadata } from "next";
import "./globals.css";
import { RootProviders } from "@/components/providers/RootProviders";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ProfitPnL — AI Trading Journal",
  description:
    "Professional AI-powered trading journal for serious prop traders.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
