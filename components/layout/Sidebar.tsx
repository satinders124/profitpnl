"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  CreditCard,
  Crown,
  FlaskConical,
  Home,
  ListChecks,
  ArrowUpRight,
  Settings,
  Shield,
  Sparkles,
  Timer,
  Zap,
  LogOut,
  Award,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMode } from "@/components/providers/ModeProvider";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const liveNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: Home }],
  },
  {
    label: "Journal & Analytics",
    items: [
      { label: "Trade Log", href: "/trades", icon: ListChecks },
      { label: "Performance", href: "/analytics", icon: BarChart3 },
      { label: "Certificates", href: "/certificates", icon: Award },
      { label: "AI Coach", href: "/ai-coach", icon: Sparkles, badge: "Pro" },
      { label: "Psychology", href: "/psychology", icon: Brain },
      { label: "Playbook", href: "/playbook", icon: BookOpen },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Accounts", href: "/accounts", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const backtestNavGroups: NavGroup[] = [
  {
    label: "Backtesting Journal",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: Home },
      { label: "Trade Log", href: "/trades", icon: ListChecks },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "AI Coach", href: "/ai-coach", icon: Sparkles, badge: "Pro" },
      { label: "Playbook", href: "/playbook", icon: BookOpen },
    ],
  },
];

function initials(email?: string | null, name?: string | null) {
  const source = name || email || "Trader";
  return source
    .split(" ")
    .map((x) => x[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ModeSwitch({ isBacktest }: { isBacktest: boolean }) {
  const router = useRouter();
  const { setMode } = useMode();

  return (
    <button
      onClick={() => {
        setMode(isBacktest ? "live" : "backtest");
        router.push("/dashboard");
      }}
      className="group flex w-full items-center justify-between gap-2 rounded-xl border border-[#262636] bg-[#0E0E14] px-3 py-2.5 text-xs font-semibold transition-all hover:border-[#F0B429]/40"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            isBacktest
              ? "bg-[#F0B429]/15 text-[#F0B429]"
              : "bg-[#181824] text-zinc-400"
          }`}
        >
          <FlaskConical size={14} />
        </span>
        <span className="truncate text-zinc-200">
          {isBacktest ? "Backtesting Mode" : "Live Journal"}
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-[#181824] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300 group-hover:text-[#F0B429]">
        {isBacktest ? "Live" : "BT"}
      </span>
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useMode();
  const isBacktest = mode === "backtest";
  const {
    user,
    plan,
    planSource,
    trialEndsAtMs,
    hasUsedTrial,
    displayName,
    isAffiliate,
    logout,
  } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isPro = plan === "Pro Plan";
  const isFree = plan === "Free Plan";
  const isOnTrial = planSource === "trial" && isPro;
  const isProPaid = isPro && planSource !== "trial";
  const canStartTrial = isFree && !hasUsedTrial;

  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  useEffect(() => {
    if (isOnTrial && trialEndsAtMs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrialDaysRemaining(
        Math.max(
          0,
          Math.ceil((trialEndsAtMs - Date.now()) / (1000 * 60 * 60 * 24))
        )
      );
    } else {
      setTrialDaysRemaining(0);
    }
  }, [isOnTrial, trialEndsAtMs]);

  const navGroupsForUser = isAffiliate
    ? liveNavGroups.map((group) =>
        group.label === "Management"
          ? {
              ...group,
              items: [
                group.items[0],
                { label: "Affiliate", href: "/affiliate", icon: Award },
                ...group.items.slice(1),
              ],
            }
          : group
      )
    : liveNavGroups;

  const groups = isBacktest ? backtestNavGroups : navGroupsForUser;

  const planBadge = isOnTrial
    ? {
        text: `Trial — ${trialDaysRemaining}d`,
        color: "text-[#F0B429] bg-[#F0B429]/10 border-[#F0B429]/25",
      }
    : isProPaid
      ? { text: "Pro", color: "text-[#F0B429] bg-[#F0B429]/10 border-[#F0B429]/25" }
      : { text: "Free", color: "text-zinc-400 bg-[#181824] border-[#282838]" };

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#1F1F2C] bg-[#0E0E14] lg:flex font-sans select-none">
      {/* ─── LOGO + PLAN BADGE ─── */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 border-b border-[#1F1F2C] px-5 py-4 hover:bg-[#12121A] transition-colors"
      >
        <img
          src="/favicon.png"
          alt="ProfitPnL"
          className="h-9 w-9 aspect-square object-contain rounded-lg shadow-sm shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-white">
              ProfitPnL
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${planBadge.color}`}
            >
              {isProPaid && <Crown size={9} />}
              {isOnTrial && <Timer size={9} />}
              {planBadge.text}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 font-normal">
            {isBacktest ? "Backtesting Journal" : "Trading Journal"}
          </div>
        </div>
      </Link>

      {/* ─── NAV ─── */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6 no-scrollbar">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-3 text-xs font-semibold text-zinc-500">
              {group.label}
            </div>

            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
                      active
                        ? "bg-[#F0B429]/10 text-[#F0B429] font-semibold border border-[#F0B429]/30 shadow-[0_0_0_1px_rgba(240,180,41,0.05)]"
                        : "text-zinc-400 hover:bg-[#12121A] hover:text-zinc-200 border border-transparent",
                    ].join(" ")}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F0B429]" />
                    )}
                    <Icon
                      size={17}
                      strokeWidth={active ? 2.1 : 1.8}
                      className={
                        active
                          ? "text-[#F0B429]"
                          : "text-zinc-500 group-hover:text-zinc-300 transition-colors"
                      }
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#F0B429]/10 text-[#F0B429] border border-[#F0B429]/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* ─── MODE SWITCH ─── */}
        <div className="px-0 pt-1">
          <ModeSwitch isBacktest={isBacktest} />
        </div>
      </nav>

      {/* ─── UPGRADE BANNER (Free users only) ─── */}
      {isFree && (
        <div className="px-3 pb-2">
          <Link
            href="/upgrade"
            className="group block rounded-xl border border-[#F0B429]/20 bg-gradient-to-br from-[#1A1608] to-[#0E0E14] p-4 transition-all hover:border-[#F0B429]/40 hover:shadow-[0_0_20px_rgba(240,180,41,0.08)]"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F0B429]/15 flex items-center justify-center shrink-0">
                {canStartTrial ? (
                  <Zap size={16} className="text-[#F0B429]" />
                ) : (
                  <Crown size={16} className="text-[#F0B429]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold leading-tight">
                  {canStartTrial ? "Start Free Trial" : "Upgrade to Pro"}
                </p>
                <p className="text-zinc-500 text-[11px] mt-1 leading-snug">
                  {canStartTrial
                    ? "7 days free — AI Coach, unlimited trades & more."
                    : "Unlock AI Coach, auto-sync & advanced analytics."}
                </p>
              </div>
              <ArrowUpRight
                size={14}
                className="text-[#F0B429] shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </Link>
        </div>
      )}

      {/* ─── TRIAL COUNTDOWN BANNER (Trial users only) ─── */}
      {isOnTrial && (
        <div className="px-3 pb-2">
          <Link
            href="/upgrade"
            className="group block rounded-xl border border-[#F0B429]/20 bg-gradient-to-br from-[#1A1608] to-[#0E0E14] p-4 transition-all hover:border-[#F0B429]/40"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#F0B429] text-[11px] font-bold flex items-center gap-1">
                <Timer size={11} />
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left
              </span>
              <span className="text-zinc-500 text-[10px]">
                {trialEndsAtMs
                  ? new Date(trialEndsAtMs).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#1F1F2C] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F0B429] to-[#d99f1e] rounded-full transition-all"
                style={{
                  width: `${Math.max(
                    5,
                    Math.min(100, (trialDaysRemaining / 7) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-zinc-400 text-[11px] mt-2 flex items-center gap-1">
              <Crown size={10} className="text-[#F0B429]" />
              Upgrade to keep Pro access
              <ArrowUpRight
                size={10}
                className="text-[#F0B429] opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </p>
          </Link>
        </div>
      )}

      {/* ─── USER PROFILE CARD & LOGOUT ─── */}
      <div className="p-3 border-t border-[#1F1F2C] bg-[#0A0A0E] flex items-center gap-2">
        <Link
          href="/settings"
          className="flex flex-1 min-w-0 items-center gap-2.5 rounded-xl border border-[#1F1F2C] bg-[#0E0E14] p-2.5 transition-all hover:border-[#2C2C3E] hover:bg-[#12121A]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181824] border border-[#282838] text-xs font-semibold text-zinc-200 shrink-0">
            {initials(user?.email, displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">
              {displayName || "Trader"}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {isPro ? (
                <Crown size={10} className="text-[#F0B429] shrink-0" />
              ) : (
                <Shield size={10} className="text-zinc-500 shrink-0" />
              )}
              <span
                className={`truncate text-[10px] font-medium ${
                  isPro ? "text-[#F0B429]" : "text-zinc-400"
                }`}
              >
                {isOnTrial
                  ? `Pro Trial (${trialDaysRemaining}d)`
                  : plan || "Free Plan"}
              </span>
            </div>
          </div>
        </Link>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title="Sign out of ProfitPnL"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1F1F2C] bg-[#0E0E14] text-zinc-400 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* ─── LOGOUT CONFIRMATION MODAL ─── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#12121A] border border-[#242436] rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                <LogOut size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">
                  Sign out of ProfitPnL?
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Are you sure you want to end your current session?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#181824] border border-[#282838] hover:bg-[#202030] text-zinc-300 text-xs font-semibold transition-colors"
              >
                No, Stay Logged In
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20"
              >
                <LogOut size={13} />
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
