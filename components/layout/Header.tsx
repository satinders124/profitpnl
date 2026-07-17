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
  const cleanActionLabel = actionLabel?.replace(/^\+\s*/, "");

  function toggleMode() {
    if (isBacktest) {
      setMode("live");
      router.push("/dashboard");
    } else {
      setMode("backtest");
      router.push("/dashboard");
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
              title={isBacktest ? "Switch to Live Journal workspace" : "Switch to Backtesting workspace"}
              className={[
                "hidden sm:inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition-all",
                isBacktest
                  ? "border-[#F0B429]/35 bg-[#F0B429]/10 text-[#F0B429] hover:bg-[#F0B429]/15"
                  : "border-[#00D084]/25 bg-[#00D084]/10 text-[#00D084] hover:bg-[#00D084]/15",
              ].join(" ")}
            >
              {isBacktest ? (
                <FlaskConical size={12} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D084] shadow-[0_0_8px_#00D084]" />
              )}
              <span>{isBacktest ? "Backtesting" : "Live Journal"}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-[9px] text-white/80">Switch</span>
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
            <span>{cleanActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
