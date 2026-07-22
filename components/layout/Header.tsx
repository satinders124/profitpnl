"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMode } from "@/components/providers/ModeProvider";
import { getActiveShift, type TraderShift } from "@/lib/shifts-db";
import { useRouter } from "next/navigation";
import { Clock3, FlaskConical, Moon, Plus, Sun } from "lucide-react";

type HeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function formatShiftElapsed(clockIn: string, nowMs: number) {
  const start = new Date(clockIn).getTime();
  if (!Number.isFinite(start)) return "0m";
  const totalMinutes = Math.max(0, Math.floor((nowMs - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
}

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
  const [activeShift, setActiveShift] = useState<TraderShift | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("profitpnl_theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("profitpnl_theme", nextTheme);
  }

  const refreshActiveShift = useCallback(async () => {
    if (!user || isBacktest) {
      setActiveShift(null);
      return;
    }
    try {
      const shift = await getActiveShift(user.id);
      setActiveShift(shift);
    } catch {
      setActiveShift(null);
    }
  }, [user, isBacktest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshActiveShift();
    const handler = () => refreshActiveShift();
    window.addEventListener("profitpnl:shift-updated", handler);
    return () => window.removeEventListener("profitpnl:shift-updated", handler);
  }, [refreshActiveShift]);

  useEffect(() => {
    if (!activeShift) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeShift]);

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

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-full border border-[#1E1E38] bg-[#111124] px-3 py-2 text-xs font-black text-[#A0A0C0] transition hover:border-[#F0B429]/40 hover:text-[#F0B429]"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          <span className="hidden md:inline">{theme === "light" ? "Dark" : "Light"}</span>
        </button>

        {activeShift && !isBacktest && (
          <button
            onClick={() => router.push("/psychology/guard")}
            className="inline-flex items-center gap-2 rounded-full border border-[#00D084]/30 bg-[#00D084]/10 px-3 py-2 text-xs font-black text-[#00D084] transition hover:bg-[#00D084]/15"
            title="Active AI Risk-Guard shift timer"
          >
            <span className="h-2 w-2 rounded-full bg-[#00D084] shadow-[0_0_10px_#00D084] animate-pulse" />
            <Clock3 size={14} />
            <span className="hidden sm:inline">Shift</span>
            <span className="font-mono tabular-nums">{formatShiftElapsed(activeShift.clockIn, nowMs)}</span>
          </button>
        )}

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
