"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function UpgradePage() {
  return (
    <AppShell title="Upgrade" subtitle="Unlock ProfitPnL Pro">
      <Card className="p-6">
        <h2 className="text-xl font-black">ProfitPnL Pro</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: Stripe checkout and subscription management.
        </p>
      </Card>
    </AppShell>
  );
}
