"use client";

import { usePathname } from "next/navigation";
import { AppLoader } from "@/components/loader/AppLoader";
import { AuthProvider } from "@/components/providers/AuthProvider";

/**
 * Public SEO tools should not initialize auth or show the journal loader.
 * That keeps calculator pages fast, crawlable, and truly no-sign-in-required.
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicTool = pathname === "/tools" || pathname.startsWith("/tools/");

  if (isPublicTool) {
    return <>{children}</>;
  }

  return (
    <AppLoader>
      <AuthProvider>{children}</AuthProvider>
    </AppLoader>
  );
}
