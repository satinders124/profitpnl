"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Brain,
  Calendar,
  ClipboardCheck,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Target,
} from "lucide-react";

type AiReport = {
  id: string;
  report_type: string;
  source_page: string | null;
  title: string;
  summary: string;
  bullets: string[];
  action: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const reportTypeLabels: Record<string, string> = {
  "daily-plan": "Daily Plan",
  "weekly-review": "Weekly Review",
  "leak-finder": "Leak Finder",
  "trade-review": "Trade Review",
  "prop-firm": "Prop Firm",
  mentor: "Mentor",
  import: "Import",
  psychology: "Psychology",
  "backtesting-report": "Backtesting",
  general: "General",
};

const reportDestinations: Record<string, string> = {
  "daily-plan": "/daily-plan",
  "weekly-review": "/weekly-review",
  "leak-finder": "/ai-leak-finder",
  "trade-review": "/trade-review",
  "prop-firm": "/prop-firm-challenge",
  mentor: "/mentor",
  import: "/import-trades",
  psychology: "/psychology",
  "backtesting-report": "/backtesting/reports",
};

function labelFor(type: string) {
  return reportTypeLabels[type] || type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toneFor(type: string) {
  if (["daily-plan", "weekly-review", "backtesting-report"].includes(type)) return "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]";
  if (["trade-review", "leak-finder", "prop-firm"].includes(type)) return "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF9AAA]";
  if (["psychology", "mentor"].includes(type)) return "border-[#4C82FB]/30 bg-[#4C82FB]/10 text-[#8BB0FF]";
  return "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]";
}

function ReportCard({ report }: { report: AiReport }) {
  const destination = reportDestinations[report.report_type] || "/dashboard";
  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20 transition hover:border-[#F0B429]/35">
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#F0B429]/8 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${toneFor(report.report_type)}`}>
            {labelFor(report.report_type)}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#5A5A80]">
            <Calendar size={12} /> {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-black text-white">{report.title}</h3>
          <p className="mt-2 line-clamp-4 text-sm leading-7 text-[#A0A0C0]">{report.summary}</p>
        </div>

        {Array.isArray(report.bullets) && report.bullets.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {report.bullets.slice(0, 3).map((bullet) => (
              <div key={bullet} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3 text-xs leading-5 text-zinc-300">
                {bullet}
              </div>
            ))}
          </div>
        )}

        {report.action && (
          <div className="rounded-2xl border border-[#F0B429]/20 bg-[#F0B429]/8 p-3 text-xs font-bold leading-5 text-[#F0B429]">
            Next action: {report.action}
          </div>
        )}

        <Link href={destination} className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#1E1E38] bg-[#111124] px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-[#F0B429]/40 hover:text-[#F0B429]">
          Open source module →
        </Link>
      </div>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <div className="text-[#F0B429]">{icon}</div>
      </div>
    </Card>
  );
}

export default function AiReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<AiReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const loadReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setWarning("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/ai/reports", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load AI reports.");
      setReports(json.reports || []);
      if (json.warning === "missing_table") {
        setWarning("AI report history table is not enabled yet. Run the ai_reports Supabase migration to save reports.");
      }
    } catch (error) {
      console.error("AI reports load error:", error);
      setWarning("Could not load AI reports. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports();
  }, [loadReports]);

  const types = useMemo(() => Array.from(new Set(reports.map((report) => report.report_type))).sort(), [reports]);
  const filteredReports = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (filter !== "all" && report.report_type !== filter) return false;
      if (cleanSearch) {
        const haystack = [report.title, report.summary, report.action, ...(report.bullets || [])].join(" ").toLowerCase();
        if (!haystack.includes(cleanSearch)) return false;
      }
      return true;
    });
  }, [reports, filter, search]);

  if (!user) return null;

  return (
    <AppShell title="AI Reports" subtitle="Saved AI insights, coaching notes, and action history.">
      <div className="mx-auto max-w-6xl space-y-7 pb-24">
        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(76,130,251,0.12),transparent_30%)]" />
          <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.75fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                <Sparkles size={12} /> Saved Intelligence
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">AI Reports Library</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                Every generated AI insight becomes part of your trading history — Daily Plan, Weekly Review, Leak Finder, Prop Firm, Trade Review, Import and Backtesting notes.
              </p>
            </div>
            <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Saved Reports</p>
              <p className="mt-2 text-5xl font-black text-[#F0B429]">{reports.length}</p>
              <p className="mt-1 text-xs text-[#8080A0]">AI-generated reports saved to your account.</p>
            </div>
          </div>
        </Card>

        {warning && (
          <div className="rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-4 py-3 text-sm font-bold text-[#F0B429]">
            {warning}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Reports" value={String(reports.length)} icon={<Brain size={20} />} />
          <Stat label="Report Types" value={String(types.length)} icon={<Filter size={20} />} />
          <Stat label="Visible" value={String(filteredReports.length)} icon={<Target size={20} />} />
        </div>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Report Filters</p>
              <h2 className="mt-1 text-lg font-black text-white">Find saved intelligence</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A80]" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reports..."
                  className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#F0B429] sm:w-72"
                />
              </div>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F0B429]"
              >
                <option value="all">All report types</option>
                {types.map((type) => (
                  <option key={type} value={type}>{labelFor(type)}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Loading AI reports…</div>
        ) : filteredReports.length === 0 ? (
          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-10 text-center">
            <ClipboardCheck className="mx-auto text-[#F0B429]" size={34} />
            <h2 className="mt-4 text-2xl font-black text-white">No saved reports yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#8080A0]">
              Generate AI insights on Daily Plan, Weekly Review, Trade Review, Prop Firm Mode, Import Center, Psychology, Mentor or Backtesting pages. They will appear here.
            </p>
            <Link href="/daily-plan" className="gold-gradient mt-6 inline-flex rounded-2xl px-6 py-3 text-sm font-black text-[#080810]">
              Generate First Report
            </Link>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
