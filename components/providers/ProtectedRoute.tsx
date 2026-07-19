"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function currentReturnPath() {
  if (typeof window === "undefined") return "/dashboard";
  return `${window.location.pathname}${window.location.search || ""}`;
}

function loginPathForCurrentPage() {
  const returnPath = currentReturnPath();
  return `/login?next=${encodeURIComponent(returnPath)}`;
}

function LoadingScreen({ message, loginHref }: { message: string; loginHref?: string }) {
  return (
    <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <img src="/favicon.png" alt="ProfitPnL" className="mb-2 h-12 w-12 rounded-2xl shadow-lg shadow-[#F0B429]/20" />
        <div className="h-6 w-6 rounded-full border-2 border-[#F0B429]/30 border-t-[#F0B429] animate-spin" />
        <span className="text-sm font-bold text-zinc-300">{message}</span>
        <span className="text-xs leading-5 text-[#5A5A80]">If nothing happens, open the login page and ProfitPnL will bring you back here after sign-in.</span>
        <a href={loginHref || (typeof window !== "undefined" ? loginPathForCurrentPage() : "/login")} className="mt-2 rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-4 py-2 text-xs font-black text-[#F0B429]">
          Continue to Login
        </a>
      </div>
    </div>
  );
}

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
      const target = loginPathForCurrentPage();
      const timer = setTimeout(() => {
        router.replace(target);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingScreen message="Loading ProfitPnL…" />;
  }

  if (!user) {
    return <LoadingScreen message="Taking you to secure login…" />;
  }

  return <>{children}</>;
}
