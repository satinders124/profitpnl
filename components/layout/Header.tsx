"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useMode } from "@/components/providers/ModeProvider";
import { useRouter } from "next/navigation";
import { Plus, FlaskConical } from "lucide-react";

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
  const { mode, setMode } = useMode();
  const router = useRouter();
  const isBacktest = mode === "backtest";

  function toggleMode() {
    if (isBacktest) {
      setMode("live");
      router.push("/dashboard");
    } else {
      setMode("backtest");
      router.push("/bt");
    }
  }

  return (
    <header className="flex min-h-[64px] shrink-0 items-center justify-between gap-4 border-b border-[#1F1F2C] bg-[#0E0E14] px-6 lg:px-8 font-sans">
      <div className="min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-lg font-semibold tracking-tight text-white lg:text-xl">
              {title}
            </h1>
            <button
              type="button"
              onClick={toggleMode}
              title={
                isBacktest
                  ? "You are in Backtesting Mode — click to return to the live Journal"
                  : "Switch to Backtesting Mode"
              }
              className={
                isBacktest
                  ? "hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#F0B429]/10 text-[#F0B429] border border-[#F0B429]/30 transition-colors hover:bg-[#F0B429]/20"
                  : "hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-[#181824] text-zinc-300 border border-[#282838] transition-colors hover:border-[#F0B429]/40 hover:text-[#F0B429]"
              }
            >
              {isBacktest ? (
                <>
                  <FlaskConical size={11} />
                  <span>Backtesting Mode</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live System</span>
                </>
              )}
            </button>
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
