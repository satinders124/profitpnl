"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Profile, billing and preferences">
      <Card className="p-6">
        <h2 className="text-xl font-black">Settings</h2>
        <p className="mt-2 text-sm text-[#A0A0C0]">
          Next step: profile, plan status, billing portal and logout.
        </p>
      </Card>
    </AppShell>
  );
}
