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
    <header className="flex min-h-[64px] shrink-0 items-center justify-between gap-4 border-b border-[#1E1E38] bg-[#111120] px-4 lg:px-7">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-black tracking-[-0.04em] text-[#F0F0FF] lg:text-xl">
          {title}
        </h1>
        <p className="mt-0.5 truncate text-xs font-medium text-[#5A5A80]">
          {subtitle || user?.email || "ProfitPnL"}
        </p>
      </div>

      {actionLabel && (
        <button
          onClick={onAction}
          className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-[#080810]"
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </header>
  );
}