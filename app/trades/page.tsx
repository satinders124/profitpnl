"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function TradesPage() {
  return (
    <AppShell title="Trade Log" subtitle="Manage every trade" actionLabel="Log Trade">
      <Card className="p-6">
        <h2 className="text-xl font-black">Trade Log</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: we will connect Firestore and build add/edit/delete trades.
        </p>
      </Card>
    </AppShell>
  );
}
