"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase-client";
import { getTrades, saveTrade } from "@/lib/db";
import { Trade } from "@/types/trade";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Save,
  Sparkles,
  Tag,
  Target,
  Wand2,
  Zap,
} from "lucide-react";

const emotions = ["Calm", "Confident", "FOMO", "Anxious", "Revenge", "Bored", "Greedy", "Fearful"];
const mistakes = ["None", "Late entry", "Moved stop", "Chased", "Oversized", "No plan", "Revenge trade", "Exited early"];

type TradeAiReview = {
  diagnosis: string;
  issueType: "Strategy" | "Execution" | "Risk" | "Psychology" | "Data Quality";
  suggestedEmotion: string;
  suggestedMistake: string;
  suggestedLesson: string;
  nextRule: string;
  notes: string;
  confidence: "High" | "Medium" | "Low";
  aiGenerated: boolean;
};

function needsReview(trade: Trade) {
  return !trade.reviewed || !trade.emotion || !trade.lesson || !trade.mistake;
}

function formatR(value: unknown) {
  const parsed = Number(value || 0);
  return `${parsed >= 0 ? "+" : ""}${parsed.toFixed(2)}R`;
}

function confidenceTone(confidence: TradeAiReview["confidence"]) {
  if (confidence === "High") return "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]";
  if (confidence === "Low") return "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]";
  return "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]";
}

function issueTone(issueType: TradeAiReview["issueType"]) {
  if (issueType === "Risk" || issueType === "Psychology") return "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]";
  if (issueType === "Strategy") return "border-[#4C82FB]/30 bg-[#4C82FB]/10 text-[#8BB0FF]";
  return "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]";
}

function mergeAiNotes(existingNotes: unknown, aiReview: TradeAiReview) {
  const existing = String(existingNotes || "").trim();
  const aiBlock = `AI Review: ${aiReview.diagnosis}\nNext rule: ${aiReview.nextRule}`;
  if (!existing) return aiBlock;
  if (existing.includes(aiReview.diagnosis) || existing.includes(aiReview.nextRule)) return existing;
  return `${existing}\n\n${aiBlock}`;
}

function buildAiPatch(aiReview: TradeAiReview, currentDraft: Partial<Trade>): Partial<Trade> {
  return {
    emotion: aiReview.suggestedEmotion || currentDraft.emotion || "",
    mistake: aiReview.suggestedMistake || currentDraft.mistake || "",
    lesson: aiReview.suggestedLesson || currentDraft.lesson || "",
    notes: mergeAiNotes(currentDraft.notes, aiReview),
    reviewed: true,
  };
}

function AiReviewPanel({
  selected,
  aiReview,
  generating,
  saving,
  onGenerate,
  onApply,
  onApplyAndSave,
}: {
  selected: Trade;
  aiReview: TradeAiReview | null;
  generating: boolean;
  saving: boolean;
  onGenerate: () => void;
  onApply: () => void;
  onApplyAndSave: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-[#F0B429]/20 bg-[#101020] p-5 shadow-[0_0_45px_-24px_#F0B429]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#F0B429]/8 to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">
            <Sparkles size={13} /> AI Trade Review
          </p>
          <h3 className="text-lg font-black text-white">AI execution diagnosis</h3>
          <p className="mt-1 text-xs leading-5 text-[#8080A0]">
            AI reviews the selected trade and can auto-fill emotion, mistake, lesson, notes, and reviewed status.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="gold-gradient inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#080810] disabled:opacity-60"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {generating ? "Reviewing" : aiReview ? "Regenerate" : "AI Review Trade"}
        </button>
      </div>

      {!aiReview ? (
        <div className="relative mt-4 rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-4 text-sm leading-6 text-[#A0A0C0]">
          Ready to review {selected.instrument || "this trade"}. Add any notes you remember, then run AI Review for a stronger diagnosis.
        </div>
      ) : (
        <div className="relative mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${issueTone(aiReview.issueType)}`}>
              {aiReview.issueType}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${confidenceTone(aiReview.confidence)}`}>
              {aiReview.confidence} confidence
            </span>
            <span className="rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#F0B429]">
              {aiReview.aiGenerated ? "AI" : "Local"}
            </span>
          </div>

          <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">Diagnosis</p>
            <p className="text-sm leading-7 text-zinc-200">{aiReview.diagnosis}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <AiSuggestion label="Emotion" value={aiReview.suggestedEmotion} />
            <AiSuggestion label="Mistake" value={aiReview.suggestedMistake} />
            <AiSuggestion label="Issue" value={aiReview.issueType} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">Suggested Lesson</p>
              <p className="text-sm leading-7 text-zinc-200">{aiReview.suggestedLesson}</p>
            </div>
            <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]">Next Trade Rule</p>
              <p className="text-sm leading-7 text-zinc-200">{aiReview.nextRule}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onApply}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-5 py-3 text-sm font-black text-[#F0B429]"
            >
              <Zap size={16} /> Apply to Draft
            </button>
            <button
              onClick={onApplyAndSave}
              disabled={saving}
              className="gold-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Apply & Save Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AiSuggestion({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-[#5A5A80]">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value || "—"}</p>
    </div>
  );
}

export default function TradeReviewPage() {
  const { user } = useAuth();
  const [requestedTradeId, setRequestedTradeId] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [draft, setDraft] = useState<Partial<Trade>>({});
  const [aiReview, setAiReview] = useState<TradeAiReview | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tradeId = new URLSearchParams(window.location.search).get("trade") || "";
    if (tradeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRequestedTradeId(tradeId);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await getTrades(user.id);
      setTrades(rows);
      const requested = requestedTradeId ? rows.find((trade) => trade.id === requestedTradeId) : undefined;
      const first = requested || rows.find(needsReview) || rows[0];
      setSelectedId((current) => requested?.id || current || first?.id || "");
      if (requested || !selectedId) {
        setDraft(first || {});
        if (requested) setNotice("Trade loaded from your post-save handoff.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, selectedId, requestedTradeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const queue = useMemo(() => trades.filter(needsReview), [trades]);
  const selected = trades.find((trade) => trade.id === selectedId);
  const reviewedCount = trades.length - queue.length;
  const completion = trades.length ? Math.round((reviewedCount / trades.length) * 100) : 0;

  function selectTrade(trade: Trade) {
    setSelectedId(trade.id);
    setDraft(trade);
    setAiReview(null);
    setNotice("");
  }

  async function saveReview(patch?: Partial<Trade>) {
    if (!user || !selected) return;
    setSaving(true);
    setNotice("");
    try {
      await saveTrade(user.id, { ...selected, ...draft, ...patch, reviewed: true });
      setNotice("Trade review saved.");
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function generateAiReview() {
    if (!selected) return;
    setGeneratingAi(true);
    setNotice("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/ai/trade-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ trade: selected, draft }),
      });
      const data = await res.json().catch(() => null) as TradeAiReview | null;
      if (!res.ok || !data) throw new Error("AI trade review failed");
      setAiReview(data);
      setNotice(data.aiGenerated ? "AI review generated." : "Local review generated. AI enhancement is available when server AI is enabled.");
    } catch (error) {
      console.error("AI trade review error:", error);
      setNotice("AI review is temporarily unavailable. You can still complete the review manually.");
    } finally {
      setGeneratingAi(false);
    }
  }

  function applyAiReview() {
    if (!aiReview) return;
    setDraft((current) => ({ ...current, ...buildAiPatch(aiReview, current) }));
    setNotice("AI review applied to draft. Save when ready.");
  }

  async function applyAndSaveAiReview() {
    if (!aiReview) return;
    const patch = buildAiPatch(aiReview, draft);
    setDraft((current) => ({ ...current, ...patch }));
    await saveReview(patch);
  }

  if (!user) return null;

  return (
    <AppShell title="Trade Review Queue" subtitle="Process trades like an inbox and turn executions into lessons.">
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]">
          <Loader2 className="mr-2 animate-spin" /> Loading review queue…
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
            <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.8fr] lg:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                  <ClipboardCheck size={12} /> Execution Review Desk
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Trade Review Queue</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                  Complete emotion, mistake, lesson, and review status so AI can find your real leaks.
                </p>
              </div>
              <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Review Completion</p>
                <p className="mt-2 text-5xl font-black text-[#F0B429]">{completion}%</p>
                <p className="mt-1 text-xs text-[#8080A0]">{queue.length} trade{queue.length === 1 ? "" : "s"} still need attention.</p>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#1E1E38]">
                  <div className="h-full rounded-full bg-[#F0B429]" style={{ width: `${completion}%` }} />
                </div>
              </div>
            </div>
          </Card>

          {notice && (
            <div className="rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-4 py-3 text-sm font-bold text-[#F0B429]">
              {notice}
            </div>
          )}

          <section className="grid gap-7 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              <h2 className="mb-5 text-lg font-black text-white">Queue</h2>
              {queue.length === 0 ? (
                <p className="rounded-2xl border border-[#00D084]/25 bg-[#00D084]/10 p-5 text-sm font-bold text-[#00D084]">
                  All trades are reviewed.
                </p>
              ) : (
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1 no-scrollbar">
                  {queue.map((trade) => (
                    <button
                      key={trade.id}
                      onClick={() => selectTrade(trade)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === trade.id ? "border-[#F0B429]/40 bg-[#F0B429]/10" : "border-[#1E1E38] bg-[#080810] hover:border-white/20"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-white">{trade.instrument || "Instrument"}</p>
                        <span className={Number(trade.result || 0) >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}>{formatR(trade.result)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#8080A0]">{trade.date} · {trade.setup || "No setup"}</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              {!selected ? (
                <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">
                  Select a trade to review.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 border-b border-[#1E1E38] pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white">{selected.instrument}</h2>
                      <p className="mt-1 text-xs text-[#8080A0]">{selected.date} · {selected.setup || "No setup"} · {formatR(selected.result)}</p>
                    </div>
                    <button
                      onClick={() => saveReview()}
                      disabled={saving}
                      className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Review
                    </button>
                  </div>

                  <AiReviewPanel
                    selected={selected}
                    aiReview={aiReview}
                    generating={generatingAi}
                    saving={saving}
                    onGenerate={generateAiReview}
                    onApply={applyAiReview}
                    onApplyAndSave={applyAndSaveAiReview}
                  />

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Sparkles size={12} /> Emotion</p>
                    <div className="flex flex-wrap gap-2">
                      {emotions.map((emotion) => (
                        <button
                          key={emotion}
                          onClick={() => setDraft((d) => ({ ...d, emotion }))}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${draft.emotion === emotion ? "border-[#F0B429]/40 bg-[#F0B429]/15 text-[#F0B429]" : "border-[#1E1E38] bg-[#080810] text-zinc-400"}`}
                        >
                          {emotion}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Tag size={12} /> Mistake</p>
                    <div className="flex flex-wrap gap-2">
                      {mistakes.map((mistake) => (
                        <button
                          key={mistake}
                          onClick={() => setDraft((d) => ({ ...d, mistake }))}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${draft.mistake === mistake ? "border-[#F0B429]/40 bg-[#F0B429]/15 text-[#F0B429]" : "border-[#1E1E38] bg-[#080810] text-zinc-400"}`}
                        >
                          {mistake}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F0B429]"><Target size={12} /> Lesson</p>
                    <textarea
                      value={String(draft.lesson || "")}
                      onChange={(e) => setDraft((d) => ({ ...d, lesson: e.target.value }))}
                      placeholder="What is the one lesson this trade teaches?"
                      className="h-28 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm text-white outline-none focus:border-[#F0B429]"
                    />
                  </label>

                  <label className="block">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Review Notes</p>
                    <textarea
                      value={String(draft.notes || "")}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Add chart context, execution notes, and rule feedback."
                      className="h-32 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#080810] p-4 text-sm text-white outline-none focus:border-[#F0B429]"
                    />
                  </label>
                </div>
              )}
            </Card>
          </section>
        </div>
      )}
    </AppShell>
  );
}
