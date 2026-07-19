"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/AuthProvider";

type Insight = {
  title: string;
  summary: string;
  bullets: string[];
  action: string;
  aiGenerated: boolean;
};

type PersistedInsight = Insight & {
  savedAt: string;
};

const fallbackInsight: Insight = {
  title: "ProfitPnL insight",
  summary: "Use this panel to turn the current page data into a clear trading action. The best journal is not just a diary — it creates rules that change the next decision.",
  bullets: ["Identify the main risk.", "Turn the weakness into a rule.", "Track whether the rule improves execution."],
  action: "Generate an AI insight when you want a deeper coaching read.",
  aiGenerated: false,
};

function isInsight(value: unknown): value is Insight {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Insight>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.bullets) &&
    typeof candidate.action === "string" &&
    typeof candidate.aiGenerated === "boolean"
  );
}

function safeParseInsight(raw: string | null): PersistedInsight | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString();
    if (!isInsight(parsed)) return null;
    return { ...parsed, savedAt };
  } catch {
    return null;
  }
}

export function PageInsightPanel({
  kind,
  context,
  initialTitle = "AI Co-Pilot Insight",
  initialSummary,
  compact = false,
  persistenceKey,
}: {
  kind: string;
  context: unknown;
  initialTitle?: string;
  initialSummary?: string;
  compact?: boolean;
  persistenceKey?: string;
}) {
  const { plan, user } = useAuth();
  const isFreePlan = plan === "Free Plan";
  const defaultInsight = useMemo<Insight>(() => ({ ...fallbackInsight, title: initialTitle, summary: initialSummary || fallbackInsight.summary }), [initialTitle, initialSummary]);
  const userId = user?.id || "";
  const insightStorageKey = userId && persistenceKey ? `profitpnl_page_insight_${userId}_${persistenceKey}` : "";
  const [insight, setInsight] = useState<Insight>(defaultInsight);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!insightStorageKey || typeof window === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInsight(defaultInsight);
      return;
    }

    const restored = safeParseInsight(window.localStorage.getItem(insightStorageKey));
    if (restored) {
      setInsight(restored);
      setNotice("Restored your last generated insight for this page.");
      return;
    }

    setInsight(defaultInsight);
    setNotice("");
  }, [defaultInsight, insightStorageKey]);

  function persistInsight(report: Insight) {
    if (!insightStorageKey || typeof window === "undefined") return;
    try {
      const payload: PersistedInsight = { ...report, savedAt: new Date().toISOString() };
      window.localStorage.setItem(insightStorageKey, JSON.stringify(payload));
    } catch {
      // localStorage can fail in private mode; AI report saving still runs below.
    }
  }

  async function saveAiReport(report: Insight, sessionToken?: string) {
    if (!report.summary) return;
    await fetch("/api/ai/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify({
        reportType: kind,
        sourcePage: kind,
        context,
        title: report.title,
        summary: report.summary,
        bullets: report.bullets,
        action: report.action,
        metadata: { aiGenerated: report.aiGenerated, persistenceKey: persistenceKey || null },
      }),
    }).catch(() => null);
  }

  async function generate() {
    if (isFreePlan) {
      setNotice("AI insights are a Pro feature. Upgrade to unlock AI-generated coaching on this page.");
      return;
    }

    setLoading(true);
    setNotice("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/ai/page-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kind, context }),
      });
      const data = await res.json().catch(() => null) as Partial<Insight> | null;
      if (!res.ok || !data) throw new Error("insight_unavailable");
      const nextInsight = {
        title: data.title || initialTitle,
        summary: data.summary || initialSummary || fallbackInsight.summary,
        bullets: Array.isArray(data.bullets) && data.bullets.length ? data.bullets : fallbackInsight.bullets,
        action: data.action || fallbackInsight.action,
        aiGenerated: Boolean(data.aiGenerated),
      };
      setInsight(nextInsight);
      persistInsight(nextInsight);
      await saveAiReport(nextInsight, token);
      setNotice(nextInsight.aiGenerated ? "AI insight saved to your report history." : "Showing local intelligence. AI enhancement is available when server AI is enabled.");
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
            <Sparkles size={13} /> {insight.aiGenerated ? "AI Co-Pilot Analysis" : "AI Intelligence Layer"}
          </p>
          <h3 className="text-lg font-black text-white">{insight.title}</h3>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="gold-gradient inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#080810] disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : isFreePlan ? <Lock size={14} /> : <Zap size={14} />}
          {loading ? "Analyzing" : isFreePlan ? "Unlock Pro AI" : insight.aiGenerated ? "Refresh AI" : "Generate AI"}
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
