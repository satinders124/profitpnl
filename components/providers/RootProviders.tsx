"use client";

import { usePathname } from "next/navigation";
import { AppLoader } from "@/components/loader/AppLoader";
import { AuthProvider } from "@/components/providers/AuthProvider";

/**
 * Public SEO/share pages should not initialize auth or show the journal loader.
 * That keeps calculators and shared certificate pages fast and crawlable.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicTool = pathname === "/tools" || pathname.startsWith("/tools/");
  const isPublicCertificate = pathname.startsWith("/cert/");

  if (isPublicTool || isPublicCertificate) {
    return <>{children}</>;
  }

  return (
    <AppLoader>
      <AuthProvider>{children}</AuthProvider>
    </AppLoader>
  );
}
