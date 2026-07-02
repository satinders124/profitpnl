"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  ListChecks,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

const items = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Blotter",
    href: "/trades",
    icon: ListChecks,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "AI Desk",
    href: "/ai-coach",
    icon: Sparkles,
  },
  {
    label: "More",
    href: "/settings",
    icon: MoreHorizontal,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] border-t border-[#1F1F2C] bg-[#0E0E14]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden font-sans select-none">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-tight transition-colors",
              active ? "text-[#F0B429] font-semibold" : "text-zinc-500 hover:text-zinc-300",
            ].join(" ")}
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.2 : 1.8}
              className="transition-transform duration-150"
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
