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
    label: "Journal",
    items: [
      {
        label: "Trade Log",
        href: "/trades",
        icon: ListChecks,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
      {
        label: "AI Coach",
        href: "/ai-coach",
        icon: Sparkles,
        badge: "AI",
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
    label: "Manage",
    items: [
      {
        label: "Accounts",
        href: "/accounts",
        icon: CreditCard,
      },
      {
        label: "Upgrade",
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
  const { user } = useAuth();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#1E1E38] bg-[#111120] lg:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 border-b border-[#1E1E38] px-5 py-5"
      >
        <div className="gold-gradient flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-[#080810] shadow-lg shadow-[#F0B429]/20">
          P
        </div>
        <div>
          <div className="text-lg font-black tracking-[-0.04em]">
            ProfitPnL
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5A5A80]">
            Trading Journal
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#2E2E52]">
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
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                      active
                        ? "border border-[#F0B429]/15 bg-[#F0B429]/10 text-[#F0B429]"
                        : "text-[#5A5A80] hover:bg-[#161628] hover:text-[#F0F0FF]",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-[#F0B429]" : "text-current"}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-[#F0B429] px-2 py-0.5 text-[10px] font-black text-[#080810]">
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

      <Link
        href="/settings"
        className="m-3 flex items-center gap-3 rounded-2xl border border-[#1E1E38] bg-[#161628] p-3 transition hover:border-[#2A2A50]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#F0B429] to-[#A855F7] text-sm font-black text-white">
          {initials(user?.email, user?.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">
            {user?.displayName || "Trader"}
          </div>
          <div className="truncate text-xs font-semibold text-[#F0B429]">
            Free Plan
          </div>
        </div>
        <MoreHorizontal size={16} className="text-[#5A5A80]" />
      </Link>
    </aside>
  );
}