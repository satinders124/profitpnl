"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Welcome back${user?.displayName ? `, ${user.displayName}` : ""}`}
      actionLabel="Log Trade"
      onAction={() => alert("Trade form coming next")}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Profit", "+$0.00", "No trades yet"],
          ["Win Rate", "—", "Start logging trades"],
          ["Expectancy", "—", "Per trade average"],
          ["Open Trades", "0", "Pending positions"],
        ].map(([label, value, sub]) => (
          <Card key={label} className="p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
              {label}
            </div>
            <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#F0B429]">
              {value}
            </div>
            <div className="mt-1 text-xs font-semibold text-[#5A5A80]">
              {sub}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black">Equity Curve</div>
              <div className="mt-1 text-xs text-[#5A5A80]">
                Real chart coming after Firestore trade data layer.
              </div>
            </div>
            <div className="rounded-full border border-[#1E1E38] px-3 py-1 text-xs font-bold text-[#5A5A80]">
              0 trades
            </div>
          </div>

          <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#1E1E38] bg-[#0D0D1A] text-sm text-[#5A5A80]">
            Chart placeholder
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-black">Quick Actions</div>
          <div className="mt-4 space-y-3">
            <button className="w-full rounded-xl border border-[#1E1E38] px-4 py-3 text-left text-sm font-bold text-[#A0A0C0]">
              + Log first trade
            </button>
            <button className="w-full rounded-xl border border-[#1E1E38] px-4 py-3 text-left text-sm font-bold text-[#A0A0C0]">
              Create account
            </button>
            <button className="w-full rounded-xl border border-[#1E1E38] px-4 py-3 text-left text-sm font-bold text-[#A0A0C0]">
              Open AI Coach
            </button>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <button
          onClick={logout}
          className="rounded-xl border border-[#1E1E38] px-4 py-2 text-sm font-bold text-[#A0A0C0]"
        >
          Logout
        </button>
      </div>
    </AppShell>
  );
}