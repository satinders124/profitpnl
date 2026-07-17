"use client";

import { useState } from "react";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

type Insight = {
  title: string;
  summary: string;
  bullets: string[];
  action: string;
  aiGenerated: boolean;
};

const fallbackInsight: Insight = {
  title: "ProfitPnL insight",
  summary: "Use this panel to turn the current page data into a clear trading action. The best journal is not just a diary — it creates rules that change the next decision.",
  bullets: ["Identify the main risk.", "Turn the weakness into a rule.", "Track whether the rule improves execution."],
  action: "Generate a Claude insight when you want a deeper coaching read.",
  aiGenerated: false,
};

export function PageInsightPanel({
  kind,
  context,
  initialTitle = "Claude Co-Pilot Insight",
  initialSummary,
  compact = false,
}: {
  kind: string;
  context: unknown;
  initialTitle?: string;
  initialSummary?: string;
  compact?: boolean;
}) {
  const [insight, setInsight] = useState<Insight>({ ...fallbackInsight, title: initialTitle, summary: initialSummary || fallbackInsight.summary });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function generate() {
    setLoading(true);
    setNotice("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/ai/page-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ kind, context }),
      });
      const data = await res.json().catch(() => null) as Partial<Insight> | null;
      if (!res.ok || !data) throw new Error("insight_unavailable");
      setInsight({
        title: data.title || initialTitle,
        summary: data.summary || initialSummary || fallbackInsight.summary,
        bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : fallbackInsight.bullets,
        action: data.action || fallbackInsight.action,
        aiGenerated: Boolean(data.aiGenerated),
      });
      if (!data.aiGenerated) setNotice("Showing local intelligence. Claude enhancement is available when server AI is enabled.");
    } catch {
      setNotice("AI insight is temporarily unavailable. Showing local intelligence instead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] border border-[#F0B429]/20 bg-[#101020] ${compact ? "p-4" : "p-5"} shadow-[0_0_45px_-24px_#F0B429]`}>
      <div className="absolute inset-0 bg-gradient-to-r from-[#F0B429]/8 to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">
            <Sparkles size={13} /> {insight.aiGenerated ? "Claude Co-Pilot Analysis" : "AI Intelligence Layer"}
          </p>
          <h3 className="text-lg font-black text-white">{insight.title}</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="gold-gradient inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#080810] disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {loading ? "Analyzing" : insight.aiGenerated ? "Refresh AI" : "Generate Claude"}
        </button>
      </div>

      <p className="relative mt-4 text-sm leading-7 text-zinc-200">{insight.summary}</p>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
        {insight.bullets.slice(0, 3).map((bullet, index) => (
          <div key={`${bullet}-${index}`} className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3 text-xs leading-5 text-zinc-300">
            {bullet}
          </div>
        ))}
      </div>

      <div className="relative mt-4 rounded-2xl border border-[#F0B429]/20 bg-[#F0B429]/8 p-3 text-xs font-bold leading-5 text-[#F0B429]">
        Next action: {insight.action}
      </div>

      {notice && <p className="relative mt-3 text-[11px] text-[#8080A0]">{notice}</p>}
    </div>
  );
}
