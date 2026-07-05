"use client";

import { usePathname } from "next/navigation";
import { AppLoader } from "@/components/loader/AppLoader";
import { AuthProvider } from "@/components/providers/AuthProvider";

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
]);

/**
 * Public SEO/share/legal pages should not initialize auth or show the journal loader.
 * That keeps calculators, shared certificates, and legal pages fast and crawlable.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicTool = pathname === "/tools" || pathname.startsWith("/tools/");
  const isPublicCertificate = pathname.startsWith("/cert/");
  const isPublicNoAuthPage = PUBLIC_NO_AUTH_PATHS.has(pathname);

  if (isPublicTool || isPublicCertificate || isPublicNoAuthPage) {
    return <>{children}</>;
  }

  return (
    <AppLoader>
      <AuthProvider>{children}</AuthProvider>
    </AppLoader>
  );
}
