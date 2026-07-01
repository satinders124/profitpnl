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
    label: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Trades",
    href: "/trades",
    icon: ListChecks,
  },
  {
    label: "Stats",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "AI",
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] border-t border-[#1E1E38] bg-[#111120] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.08em]",
              active ? "text-[#F0B429]" : "text-[#5A5A80]",
            ].join(" ")}
          >
            <Icon size={22} strokeWidth={1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}