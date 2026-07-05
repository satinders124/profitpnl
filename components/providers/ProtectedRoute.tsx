"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (user) {
      hasRedirected.current = false;
      return;
    }
    if (loading) return;

    if (!hasRedirected.current) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        router.replace("/login");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-[#F0B429]/30 border-t-[#F0B429] animate-spin" />
          <span className="text-sm text-[#5A5A80]">Loading ProfitPnL…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
