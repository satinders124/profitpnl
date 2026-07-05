import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AppLoader } from "@/components/loader/AppLoader";

export const metadata: Metadata = {
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
        <AppLoader>
          <AuthProvider>{children}</AuthProvider>
        </AppLoader>
      </body>
    </html>
  );
}
