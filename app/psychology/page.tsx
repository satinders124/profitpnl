"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function PsychologyPage() {
  return (
    <AppShell title="Psychology" subtitle="Mindset and behaviour tracking">
      <Card className="p-6">
        <h2 className="text-xl font-black">Psychology</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: mood journal, behaviour tags and AI psychology patterns.
        </p>
      </Card>
    </AppShell>
  );
}
