"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function PlaybookPage() {
  return (
    <AppShell title="Playbook" subtitle="Your trading strategies" actionLabel="Add Strategy">
      <Card className="p-6">
        <h2 className="text-xl font-black">Playbook</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: strategy rules, entry model, invalidation and screenshots.
        </p>
      </Card>
    </AppShell>
  );
}
