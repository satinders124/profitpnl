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
  ClipboardCheck,
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
  ShieldCheck,
  Search,
  GraduationCap,
  FileSpreadsheet,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const liveMainItems: NavItem[] = [
  { label: "HQ", href: "/dashboard", icon: Home },
  { label: "Plan", href: "/daily-plan", icon: ClipboardCheck },
  { label: "Trades", href: "/trades", icon: ListChecks },
  { label: "AI Desk", href: "/ai-coach", icon: Sparkles },
];

const liveMoreSectionsBase: NavSection[] = [
  {
    label: "Command",
    items: [
      { label: "Weekly Review", href: "/weekly-review", icon: ClipboardCheck },
    ],
  },
  {
    label: "Journal",
    items: [
      { label: "Trade Review", href: "/trade-review", icon: ClipboardCheck },
      { label: "Import Center", href: "/import-trades", icon: FileSpreadsheet },
      { label: "Playbook", href: "/playbook", icon: BookOpen },
    ],
  },
  {
    label: "AI Intelligence",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "AI Reports", href: "/ai-reports", icon: ClipboardCheck },
      { label: "AI Leak Finder", href: "/ai-leak-finder", icon: Search },
      { label: "AI Risk-Guard", href: "/psychology/guard", icon: Brain },
      { label: "Prop Firm Mode", href: "/prop-firm-challenge", icon: ShieldCheck },
      { label: "Psychology", href: "/psychology", icon: Brain },
    ],
  },
  {
    label: "Growth & Account",
    items: [
      { label: "Certificates", href: "/certificates", icon: Award },
      { label: "Onboarding", href: "/onboarding", icon: Sparkles },
      { label: "Mentor Mode", href: "/mentor", icon: GraduationCap },
      { label: "Accounts", href: "/accounts", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const backtestMainItems: NavItem[] = [
  { label: "HQ", href: "/dashboard", icon: Home },
  { label: "Trades", href: "/trades", icon: ListChecks },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "AI Coach", href: "/ai-coach", icon: Sparkles },
];

const backtestMoreSections: NavSection[] = [
  {
    label: "Backtesting Journal",
    items: [
      { label: "Reports", href: "/backtesting/reports", icon: ClipboardCheck },
      { label: "Playbook", href: "/playbook", icon: BookOpen },
      { label: "Accounts", href: "/accounts", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];


export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAffiliate } = useAuth();
  const { mode, setMode } = useMode();
  const isBacktest = mode === "backtest";
  const [moreOpen, setMoreOpen] = useState(false);

  const mainItems = isBacktest ? backtestMainItems : liveMainItems;

  const liveMoreSections = isAffiliate
    ? liveMoreSectionsBase.map((section) =>
        section.label === "Growth & Account"
          ? {
              ...section,
              items: [
                section.items[0],
                section.items[1],
                { label: "Affiliate", href: "/affiliate", icon: Award },
                ...section.items.slice(2),
              ],
            }
          : section
      )
    : liveMoreSectionsBase;

  const moreSections = isBacktest ? backtestMoreSections : liveMoreSections;

  const moreItems = moreSections.flatMap((section) => section.items);

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
              prefetch={false}
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

              <div className="max-h-[72vh] overflow-y-auto p-4 no-scrollbar">
                <div className="space-y-5">
                  {moreSections.map((section) => (
                    <div key={section.label}>
                      <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                        {section.label}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {section.items.map((item) => {
                          const active =
                            pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              prefetch={false}
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
                    </div>
                  ))}
                  <div>
                    <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                      Workspace
                    </div>
                    <button
                      onClick={handleSwitch}
                      className={[
                        "relative w-full overflow-hidden rounded-2xl border p-4 text-left transition active:scale-[0.99]",
                        isBacktest
                          ? "border-[#F0B429]/35 bg-[#F0B429]/10 shadow-[0_0_35px_-24px_#F0B429]"
                          : "border-[#00D084]/30 bg-[#00D084]/10 shadow-[0_0_35px_-24px_#00D084]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={[
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                              isBacktest
                                ? "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]"
                                : "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]",
                            ].join(" ")}
                          >
                            {isBacktest ? <FlaskConical size={18} /> : <span className="h-2.5 w-2.5 rounded-full bg-[#00D084] shadow-[0_0_10px_#00D084]" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Current mode</span>
                            <span className="block truncate text-sm font-black text-white">
                              {isBacktest ? "Backtesting Workspace" : "Live Journal Workspace"}
                            </span>
                            <span className="mt-0.5 block text-xs text-zinc-500">
                              Switch to {isBacktest ? "Live Journal" : "Backtesting"}
                            </span>
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-200">
                          Switch <ArrowUpRight size={12} />
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
