"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function AnalyticsPage() {
  return (
    <AppShell title="Analytics" subtitle="Find your edge">
      <Card className="p-6">
        <h2 className="text-xl font-black">Analytics</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: performance grade, charts, and account/strategy filters.
        </p>
      </Card>
    </AppShell>
  );
}
