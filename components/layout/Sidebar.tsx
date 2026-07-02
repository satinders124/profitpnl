"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  CreditCard,
  Home,
  LineChart,
  ListChecks,
  MoreHorizontal,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: Home,
      },
    ],
  },
  {
    label: "Journal & Analytics",
    items: [
      {
        label: "Trade Log",
        href: "/trades",
        icon: ListChecks,
      },
      {
        label: "Performance",
        href: "/analytics",
        icon: BarChart3,
      },
      {
        label: "AI Coach",
        href: "/ai-coach",
        icon: Sparkles,
        badge: "Pro",
      },
      {
        label: "Psychology",
        href: "/psychology",
        icon: Brain,
      },
      {
        label: "Playbook",
        href: "/playbook",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Accounts",
        href: "/accounts",
        icon: CreditCard,
      },
      {
        label: "Membership",
        href: "/upgrade",
        icon: Trophy,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
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

export function Sidebar() {
  const pathname = usePathname();
  const { user, plan } = useAuth();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#1F1F2C] bg-[#0E0E14] lg:flex font-sans select-none">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 border-b border-[#1F1F2C] px-5 py-4 hover:bg-[#12121A] transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#181824] border border-[#282838] text-sm font-bold text-[#F0B429] shadow-sm">
          P
        </div>
        <div>
          <div className="text-base font-semibold tracking-tight text-white">
            ProfitPnL
          </div>
          <div className="text-[11px] text-zinc-400 font-normal">
            Trading Journal
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6 no-scrollbar">
        {navGroups.map((group) => (
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
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
                      active
                        ? "bg-[#181824] text-white font-semibold border border-[#282838] shadow-sm"
                        : "text-zinc-400 hover:bg-[#12121A] hover:text-zinc-200 border border-transparent",
                    ].join(" ")}
                  >
                    <Icon
                      size={17}
                      strokeWidth={1.8}
                      className={active ? "text-[#F0B429]" : "text-zinc-500 group-hover:text-zinc-300 transition-colors"}
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
      </nav>

      <div className="p-3 border-t border-[#1F1F2C] bg-[#0A0A0E]">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl border border-[#1F1F2C] bg-[#0E0E14] p-3 transition-all hover:border-[#2C2C3E] hover:bg-[#12121A]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181824] border border-[#282838] text-xs font-semibold text-zinc-200 shrink-0">
            {initials(user?.email, user?.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">
              {user?.displayName || "Trader"}
            </div>
            <div className="truncate text-[11px] text-[#F0B429] font-medium mt-0.5">
              {plan || "Free Plan"}
            </div>
          </div>
          <MoreHorizontal size={15} className="text-zinc-500 shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
