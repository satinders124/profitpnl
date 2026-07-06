"use client";

import { usePathname } from "next/navigation";
import { AppLoader } from "@/components/loader/AppLoader";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RecoveryLinkHandler } from "@/components/providers/RecoveryLinkHandler";
import { ModeProvider } from "@/components/providers/ModeProvider";

const PUBLIC_NO_AUTH_PATHS = new Set([
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/risk-disclaimer",
  "/cookie-policy",
  "/refund-policy",
  "/journaling-guides",
  "/csv-templates",
  "/prop-firm-rules",
  "/playbooks",
  "/trading-metrics",
  "/google-sheets-trading-journal-template",
  "/reports/trader-benchmark-report",
]);

/**
 * Public SEO/share/legal pages should not initialize auth or show the journal loader.
 * That keeps calculators, shared certificates, and legal pages fast and crawlable.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicTool = pathname === "/tools" || pathname.startsWith("/tools/");
  const isPublicCertificate = pathname.startsWith("/cert/");
  const isPublicGrowthPage =
    pathname.startsWith("/prop-firm-rules/") ||
    pathname.startsWith("/playbooks/") ||
    pathname.startsWith("/trading-metrics/") ||
    pathname.startsWith("/reports/") ||
    pathname.startsWith("/embed/");
  const isPublicNoAuthPage = PUBLIC_NO_AUTH_PATHS.has(pathname);

  if (
    isPublicTool ||
    isPublicCertificate ||
    isPublicGrowthPage ||
    isPublicNoAuthPage
  ) {
    // Still forward any password-reset deep link that lands here.
    return (
      <>
        <RecoveryLinkHandler />
        {children}
      </>
    );
  }

  // Keep the branded loader on the homepage, but avoid booting Supabase/AuthProvider
  // for anonymous landing-page visitors.
  if (pathname === "/") {
    return (
      <AppLoader>
        <RecoveryLinkHandler />
        {children}
      </AppLoader>
    );
  }

  return (
    <AppLoader>
      <AuthProvider>
        <ModeProvider>
          <RecoveryLinkHandler />
          {children}
        </ModeProvider>
      </AuthProvider>
    </AppLoader>
  );
}
