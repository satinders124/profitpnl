"use client";

import { ProtectedRoute } from "@/components/providers/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";

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
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-[#080810] text-[#F0F0FF]">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            title={title}
            subtitle={subtitle}
            actionLabel={actionLabel}
            onAction={onAction}
          />

          <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 lg:px-7 lg:py-6 lg:pb-8">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}