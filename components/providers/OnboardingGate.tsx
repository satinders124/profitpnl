"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { userNeedsOnboarding } from "@/lib/onboarding-status";

const SKIP_PATHS = new Set([
  "/onboarding",
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
]);

export function OnboardingGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const checkedUser = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (SKIP_PATHS.has(pathname)) return;
    if (pathname.startsWith("/api/") || pathname.startsWith("/cert/") || pathname.startsWith("/backtest-report/")) return;
    if (checkedUser.current === `${user.id}:${pathname}`) return;
    checkedUser.current = `${user.id}:${pathname}`;

    let cancelled = false;
    userNeedsOnboarding(user.id)
      .then((needsOnboarding) => {
        if (cancelled || !needsOnboarding) return;
        router.replace("/onboarding");
      })
      .catch((error) => {
        console.warn("Onboarding gate check failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, pathname, router, user]);

  return null;
}
