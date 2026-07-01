"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function AccountsPage() {
  return (
    <AppShell title="Accounts" subtitle="Prop firm and personal accounts" actionLabel="Add Account">
      <Card className="p-6">
        <h2 className="text-xl font-black">Accounts</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: account size, drawdown, daily loss and status tracking.
        </p>
      </Card>
    </AppShell>
  );
}
