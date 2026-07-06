"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMode } from "@/components/providers/ModeProvider";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Brain,
  CreditCard,
  Home,
  ListChecks,
  MoreHorizontal,
  Settings,
  Sparkles,
  X,
  Award,
  ArrowUpRight,
  FlaskConical,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  switch?: boolean;
};

const liveMainItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Trades", href: "/trades", icon: ListChecks },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Desk", href: "/ai-coach", icon: Sparkles },
];

const liveMoreItemsBase: NavItem[] = [
  { label: "Certificates", href: "/certificates", icon: Award },
  { label: "Playbook", href: "/playbook", icon: BookOpen },
  { label: "Psychology", href: "/psychology", icon: Brain },
  { label: "Accounts", href: "/accounts", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

const backtestMainItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Trades", href: "/trades", icon: ListChecks },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Coach", href: "/ai-coach", icon: Sparkles },
];

const backtestMoreItems: NavItem[] = [
  { label: "Playbook", href: "/playbook", icon: BookOpen },
  { label: "Accounts", href: "/accounts", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
  {
    label: "Shift to Live Journal",
    href: "/dashboard",
    icon: ArrowUpRight,
    switch: true,
  },
];

const switchItem: NavItem = {
  label: "Switch to Backtesting mode",
  href: "/dashboard",
  icon: FlaskConical,
  switch: true,
};

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAffiliate } = useAuth();
  const { mode, setMode } = useMode();
  const isBacktest = mode === "backtest";
  const [moreOpen, setMoreOpen] = useState(false);

  const mainItems = isBacktest ? backtestMainItems : liveMainItems;

  const moreItems = isBacktest
    ? backtestMoreItems
    : isAffiliate
      ? [
          liveMoreItemsBase[0],
          liveMoreItemsBase[1],
          liveMoreItemsBase[2],
          liveMoreItemsBase[3],
          { label: "Affiliate", href: "/affiliate", icon: Award },
          ...liveMoreItemsBase.slice(4),
          switchItem,
        ]
      : [...liveMoreItemsBase, switchItem];

  const isMoreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  function handleSwitch() {
    setMoreOpen(false);
    if (isBacktest) {
      setMode("live");
      router.push("/dashboard");
    } else {
      setMode("backtest");
      router.push("/dashboard");
    }
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] border-t border-[#1F1F2C] bg-[#0E0E14]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden font-sans select-none">
        {mainItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-tight transition-colors",
                active
                  ? "text-[#F0B429] font-semibold"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {active && (
                <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[#F0B429]" />
              )}
              <span
                className={
                  active
                    ? "flex items-center justify-center rounded-lg bg-[#F0B429]/10 px-3 py-1"
                    : "flex items-center justify-center px-3 py-1"
                }
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  className="transition-transform duration-150"
                />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* More button — opens sheet */}
        <button
          onClick={() => setMoreOpen(true)}
          className={[
            "relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-tight transition-colors",
            isMoreActive
              ? "text-[#F0B429] font-semibold"
              : "text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          {isMoreActive && (
            <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[#F0B429]" />
          )}
          <span
            className={
              isMoreActive
                ? "flex items-center justify-center rounded-lg bg-[#F0B429]/10 px-3 py-1"
                : "flex items-center justify-center px-3 py-1"
            }
          >
            <MoreHorizontal
              size={20}
              strokeWidth={isMoreActive ? 2.2 : 1.8}
              className="transition-transform duration-150"
            />
          </span>
          <span>More</span>
        </button>
      </nav>

      {/* ── More Sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-[#1F1F2C] bg-[#0E0E14] pb-[env(safe-area-inset-bottom)] lg:hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-[#2A2A3C]" />
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1F1F2C]">
                <span className="text-sm font-bold text-white">More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A26] text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4">
                {moreItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  if (item.switch) {
                    return (
                      <button
                        key={item.label}
                        onClick={handleSwitch}
                        className="flex items-center gap-3 rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/[0.06] px-4 py-3.5 text-sm font-semibold text-[#F0B429] transition-all hover:bg-[#F0B429]/10"
                      >
                        <Icon size={18} strokeWidth={2.2} />
                        {item.label}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={[
                        "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all",
                        active
                          ? "border-[#F0B429]/40 bg-[#F0B429]/10 text-[#F0B429] font-semibold"
                          : "border-[#1F1F2C] bg-[#111120] text-zinc-400 hover:border-[#F0B429]/30 hover:text-white",
                      ].join(" ")}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
