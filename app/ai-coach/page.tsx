"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function AiCoachPage() {
  return (
    <AppShell title="AI Coach" subtitle="Claude Sonnet trading coach">
      <Card className="p-6">
        <h2 className="text-xl font-black">AI Coach</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: connect Claude Sonnet through a secure Next.js API route.
        </p>
      </Card>
    </AppShell>
  );
}
