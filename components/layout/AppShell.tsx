"use client";

import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/providers/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { ActiveTraderCheckinModal } from "@/components/providers/ActiveTraderCheckinModal";
import { useMode } from "@/components/providers/ModeProvider";

type AppShellProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
};

export function AppShell({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const { mode } = useMode();
  const showRiskGuardCheckin = mode !== "backtest" && pathname !== "/onboarding" && pathname !== "/psychology/guard";

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-[#08080C] text-[#F2F2F8] font-sans antialiased selection:bg-[#F0B429]/20 selection:text-[#F0B429]">
        {showRiskGuardCheckin ? <ActiveTraderCheckinModal /> : null}
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            title={title}
            subtitle={subtitle}
            actionLabel={actionLabel}
            onAction={onAction}
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-12 scroll-smooth">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}
