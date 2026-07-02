"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Plus } from "lucide-react";

type HeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function Header({
  title,
  subtitle,
  actionLabel,
  onAction,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex min-h-[64px] shrink-0 items-center justify-between gap-4 border-b border-[#1F1F2C] bg-[#0E0E14] px-6 lg:px-8 font-sans">
      <div className="min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-lg font-semibold tracking-tight text-white lg:text-xl">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#181824] text-zinc-300 border border-[#282838]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live System</span>
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs font-normal text-zinc-400">
            {subtitle || user?.email || "ProfitPnL — Performance Analytics"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {actionLabel && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] px-4 py-2 text-xs font-semibold text-black transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
