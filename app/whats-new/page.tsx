"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import {
  Bell,
  Brain,
  ClipboardCheck,
  FileSpreadsheet,
  Gauge,
  LineChart,
  MessageSquareText,
  QrCode,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const releases = [
  {
    title: "Trading HQ Command Feed",
    description: "Dashboard now tells you what needs attention today: Daily Plan, review queue, biggest leak, prop firm risk, and weekly review readiness.",
    href: "/dashboard",
    cta: "Open Trading HQ",
    icon: <LineChart size={20} />,
    tag: "Command",
  },
  {
    title: "Daily Plan + Plan vs Execution",
    description: "Generate a pre-market plan, accept it, and let ProfitPnL score whether today’s trades followed the plan.",
    href: "/daily-plan",
    cta: "Build Daily Plan",
    icon: <ClipboardCheck size={20} />,
    tag: "Daily",
  },
  {
    title: "AI Reports Library",
    description: "AI insights are saved into a report history so your coaching notes do not disappear after refresh.",
    href: "/ai-reports",
    cta: "View AI Reports",
    icon: <Brain size={20} />,
    tag: "AI",
  },
  {
    title: "AI Trade Review Actions",
    description: "AI can now suggest emotion, mistake, lesson, next rule, notes, and apply the review directly to a trade.",
    href: "/trade-review",
    cta: "Review Trades",
    icon: <MessageSquareText size={20} />,
    tag: "Journal",
  },
  {
    title: "Backtesting Report Center",
    description: "Create AI-assisted backtesting reports with CSV export, public links, PDF downloads, and QR verification.",
    href: "/backtesting/reports",
    cta: "Open Reports",
    icon: <QrCode size={20} />,
    tag: "Backtesting",
  },
  {
    title: "Import Center 2.0",
    description: "Broker presets, import quality scoring, duplicate detection, row statuses, and import reports are now included.",
    href: "/import-trades",
    cta: "Import Trades",
    icon: <FileSpreadsheet size={20} />,
    tag: "Import",
  },
  {
    title: "Prop Firm Mode + Templates",
    description: "Prop Firm Mode now works with account templates and better percentage-based target/drawdown calculations.",
    href: "/prop-firm-challenge",
    cta: "Check Challenge",
    icon: <Gauge size={20} />,
    tag: "Prop Firm",
  },
  {
    title: "AI Risk-Guard Upgrade",
    description: "The check-in flow now feels like a trading desk clearance screen, and active shifts show a timer in the header.",
    href: "/psychology/guard",
    cta: "Open Risk-Guard",
    icon: <ShieldCheck size={20} />,
    tag: "Risk",
  },
  {
    title: "Daily & Weekly Email Reminders",
    description: "Settings now include Daily Plan and Weekly Review reminder preferences. Email cron infrastructure is ready.",
    href: "/settings",
    cta: "Configure Reminders",
    icon: <Bell size={20} />,
    tag: "Retention",
  },
  {
    title: "Onboarding Wizard",
    description: "New users can configure market, account size, risk rules, psychology issue, first account, and starter playbook.",
    href: "/onboarding",
    cta: "Run Setup",
    icon: <Rocket size={20} />,
    tag: "Setup",
  },
];

function ReleaseCard({ item }: { item: (typeof releases)[number] }) {
  return (
    <Card className="group relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-[#F0B429]/35">
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#F0B429]/8 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 text-[#F0B429]">
            {item.icon}
          </div>
          <span className="rounded-full border border-[#F0B429]/25 bg-[#F0B429]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#F0B429]">
            {item.tag}
          </span>
        </div>
        <h3 className="text-lg font-black text-white">{item.title}</h3>
        <p className="mt-2 min-h-[5rem] text-sm leading-7 text-[#A0A0C0]">{item.description}</p>
        <Link href={item.href} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] bg-[#111124] px-4 py-2 text-xs font-black text-zinc-300 transition group-hover:border-[#F0B429]/40 group-hover:text-[#F0B429]">
          {item.cta} →
        </Link>
      </div>
    </Card>
  );
}

export default function WhatsNewPage() {
  return (
    <AppShell title="What’s New" subtitle="New ProfitPnL product updates and workflows.">
      <div className="mx-auto max-w-6xl space-y-7 pb-24">
        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
          <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.75fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                <Sparkles size={12} /> Product Release
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">ProfitPnL is now a full trading operating system.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                We shipped a major upgrade across planning, journaling, AI review, risk control, backtesting reports, import workflows, reminders, and onboarding.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/daily-plan" className="gold-gradient inline-flex justify-center rounded-2xl px-5 py-3 text-sm font-black text-[#080810]">Start with Daily Plan</Link>
                <Link href="/ai-reports" className="inline-flex justify-center rounded-2xl border border-[#1E1E38] bg-[#111124] px-5 py-3 text-sm font-black text-zinc-300 hover:text-white">View AI Reports</Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Release Size</p>
              <p className="mt-2 text-5xl font-black text-[#F0B429]">10+</p>
              <p className="mt-1 text-xs text-[#8080A0]">Major modules and workflows added or upgraded.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3"><p className="text-[9px] uppercase tracking-wider text-[#5A5A80]">AI</p><p className="mt-1 font-black text-white">Reports</p></div>
                <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3"><p className="text-[9px] uppercase tracking-wider text-[#5A5A80]">PDF</p><p className="mt-1 font-black text-white">QR Share</p></div>
              </div>
            </div>
          </div>
        </Card>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {releases.map((item) => <ReleaseCard key={item.title} item={item} />)}
        </section>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-6">
          <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Recommended flow</p>
              <h2 className="mt-1 text-2xl font-black text-white">Use the new system in this order</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["1", "Onboard"],
                ["2", "Daily Plan"],
                ["3", "Review Trades"],
                ["4", "Weekly Review"],
              ].map(([step, label]) => (
                <div key={step} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                  <p className="text-xs font-black text-[#F0B429]">{step}</p>
                  <p className="mt-1 text-sm font-black text-white">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
