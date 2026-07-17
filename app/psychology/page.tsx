"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJournals, saveJournal, deleteJournal } from "@/lib/db";
import { JournalEntry } from "@/types/journal";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Calendar,
  Frown,
  Lightbulb,
  Loader2,
  Meh,
  Plus,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";

type MoodValue = "disciplined" | "anxious" | "greedy" | "calm" | "frustrated" | "neutral";

type MoodTag = {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  bar: string;
  value: MoodValue;
};

const MOOD_TAGS: MoodTag[] = [
  { label: "Disciplined", icon: <ShieldCheck size={14} />, color: "text-[#00D084]", bg: "bg-[#00D084]/10", bar: "bg-[#00D084]", value: "disciplined" },
  { label: "Anxious", icon: <AlertCircle size={14} />, color: "text-orange-400", bg: "bg-orange-400/10", bar: "bg-orange-400", value: "anxious" },
  { label: "Greedy", icon: <Zap size={14} />, color: "text-red-400", bg: "bg-red-400/10", bar: "bg-red-400", value: "greedy" },
  { label: "Calm", icon: <Smile size={14} />, color: "text-blue-400", bg: "bg-blue-400/10", bar: "bg-blue-400", value: "calm" },
  { label: "Frustrated", icon: <Frown size={14} />, color: "text-purple-400", bg: "bg-purple-400/10", bar: "bg-purple-400", value: "frustrated" },
  { label: "Neutral", icon: <Meh size={14} />, color: "text-[#A0A0C0]", bg: "bg-[#A0A0C0]/10", bar: "bg-[#A0A0C0]", value: "neutral" },
];

const REFLECTION_PROMPTS = [
  "What emotion had the strongest influence on my trading today?",
  "Which rule did I follow well, and which rule needs more discipline?",
  "Did I trade from patience, pressure, or the need to recover?",
  "What should I do differently before the next session starts?",
  "What did today teach me about my risk behavior?",
];

type PsychologyEntry = JournalEntry & {
  content: string;
  mood: MoodValue | string;
};

function todayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeEntry(entry: JournalEntry): PsychologyEntry {
  return {
    ...entry,
    mood: entry.mood || "neutral",
    content: entry.entry || entry.text || entry.notes || "",
  };
}

function moodMeta(value?: string) {
  return MOOD_TAGS.find((item) => item.value === value) || MOOD_TAGS[5];
}

function parseEntryDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(date) : parsed;
}

function StatTile({ label, value, sub, icon, tone = "gold" }: { label: string; value: string; sub: string; icon: React.ReactNode; tone?: "gold" | "green" | "red" | "blue" }) {
  const color = tone === "green" ? "#00D084" : tone === "red" ? "#FF4565" : tone === "blue" ? "#4C82FB" : "#F0B429";
  return (
    <Card className="relative overflow-hidden border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg shadow-black/20">
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: color }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-white" title={value}>{value}</p>
          <p className="mt-1 text-xs leading-5 text-[#8080A0]">{sub}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-black/20" style={{ color, borderColor: `${color}40` }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function PsychologyPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PsychologyEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<MoodValue | "all">("all");
  const [search, setSearch] = useState("");

  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodValue>("neutral");

  const loadJournals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await getJournals(user.id);
      setEntries(data.map(normalizeEntry));
    } catch (err) {
      console.error("Psychology journal load error:", err);
      setError("Could not load psychology reflections. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJournals();
  }, [loadJournals]);

  const moodBreakdown = useMemo(() => {
    return MOOD_TAGS.map((tag) => {
      const count = entries.filter((entry) => entry.mood === tag.value).length;
      const percentage = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
      return { ...tag, count, percentage };
    });
  }, [entries]);

  const dominantMood = useMemo(() => {
    return moodBreakdown.slice().sort((a, b) => b.count - a.count)[0] || moodBreakdown[5];
  }, [moodBreakdown]);

  const riskMoodCount = useMemo(() => {
    return entries.filter((entry) => ["anxious", "greedy", "frustrated"].includes(entry.mood)).length;
  }, [entries]);

  const disciplinedCount = useMemo(() => {
    return entries.filter((entry) => ["disciplined", "calm"].includes(entry.mood)).length;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "all" && entry.mood !== filter) return false;
      if (cleanSearch && !entry.content.toLowerCase().includes(cleanSearch)) return false;
      return true;
    });
  }, [entries, filter, search]);

  async function handleSave() {
    if (!user || !content.trim() || saving) return;

    const cleanContent = content.trim();
    setSaving(true);
    setError("");

    try {
      const date = todayDate();
      const id = await saveJournal(user.id, {
        date,
        mood: selectedMood,
        entry: cleanContent,
        text: cleanContent,
        notes: cleanContent,
        tags: [selectedMood],
      });

      const savedEntry: PsychologyEntry = {
        id,
        date,
        mood: selectedMood,
        entry: cleanContent,
        text: cleanContent,
        notes: cleanContent,
        tags: [selectedMood],
        content: cleanContent,
      };

      setEntries((current) => [savedEntry, ...current]);
      setContent("");
      setSelectedMood("neutral");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Psychology journal save error:", err);
      setError("Could not save reflection. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this reflection?")) return;
    try {
      await deleteJournal(user.id, id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (err) {
      console.error("Psychology journal delete error:", err);
      setError("Could not delete reflection. Please try again.");
    }
  }

  function applyPrompt(prompt: string) {
    setContent((current) => current ? `${current}\n\n${prompt}\n` : `${prompt}\n`);
  }

  if (!user) return null;

  return (
    <AppShell title="Psychology Journal" subtitle="Mindset command center.">
      <div className="mx-auto w-full max-w-6xl space-y-7 pb-24">
        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
          <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.75fr] lg:p-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                <Sparkles size={12} /> Mindset Intelligence
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">Psychology Journal</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                  Track emotions, expose behavioral patterns, and turn reflections into trading rules that protect your edge.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="gold-gradient inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] shadow-[0_0_15px_rgba(240,180,41,0.3)] transition-transform active:scale-95"
              >
                <Plus size={18} /> New Reflection
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Dominant State</p>
              <div className={`mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#1E1E38] px-4 py-3 ${dominantMood.bg} ${dominantMood.color}`}>
                {dominantMood.icon}
                <span className="text-2xl font-black tracking-tight">{dominantMood.label}</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-[#8080A0]">
                {entries.length ? `${dominantMood.percentage}% of reflections currently point to this state.` : "Start logging reflections to build your emotional profile."}
              </p>
            </div>
          </div>
        </Card>

        {error && (
          <div className="rounded-2xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-sm font-bold text-[#FF4565]">
            {error}
          </div>
        )}

        <PageInsightPanel
          kind="psychology"
          initialTitle="AI mindset pattern read"
          initialSummary="Generate an AI read of your psychology journal to turn recurring emotional states into practical trading rules."
          context={{
            totalEntries: entries.length,
            dominantMood: dominantMood.label,
            riskMoodCount,
            disciplinedCount,
            moodBreakdown: moodBreakdown.map((mood) => ({ mood: mood.label, count: mood.count, percentage: mood.percentage })),
            recentEntries: entries.slice(0, 8).map((entry) => ({ date: entry.date, mood: entry.mood, content: entry.content.slice(0, 600) })),
          }}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Reflections" value={String(entries.length)} sub="Total psychology entries" icon={<Brain size={20} />} />
          <StatTile label="Composed States" value={String(disciplinedCount)} sub="Calm or disciplined logs" icon={<ShieldCheck size={20} />} tone="green" />
          <StatTile label="Risk States" value={String(riskMoodCount)} sub="Anxious, greedy, frustrated" icon={<AlertCircle size={20} />} tone="red" />
          <StatTile label="Filtered View" value={String(filteredEntries.length)} sub="Visible timeline entries" icon={<BarChart3 size={20} />} tone="blue" />
        </div>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Mood Distribution</p>
              <h2 className="mt-1 text-lg font-black text-white">Emotional pattern board</h2>
            </div>
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A80]" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reflections..."
                className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-[#F0B429]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {moodBreakdown.map((tag) => (
              <button
                key={tag.value}
                onClick={() => setFilter((current) => current === tag.value ? "all" : tag.value)}
                className={`rounded-2xl border p-4 text-left transition ${filter === tag.value ? "border-[#F0B429]/40 bg-[#F0B429]/10" : "border-[#1E1E38] bg-[#080810] hover:border-[#F0B429]/30"}`}
              >
                <div className={`flex items-center gap-2 ${tag.color}`}>
                  {tag.icon}
                  <span className="text-[10px] font-black uppercase tracking-tighter">{tag.label}</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-black text-white">{tag.percentage}%</span>
                  <span className="text-xs font-bold text-[#5A5A80]">{tag.count}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1E1E38]">
                  <div className={`h-full transition-all duration-1000 ${tag.bar}`} style={{ width: `${tag.percentage}%` }} />
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Mindset Timeline</p>
              <h2 className="mt-1 text-lg font-black text-white">Reflection archive</h2>
            </div>
            {(filter !== "all" || search) && (
              <button
                onClick={() => { setFilter("all"); setSearch(""); }}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-4 py-2 text-xs font-black text-zinc-300 hover:text-white"
              >
                <X size={14} /> Clear filters
              </button>
            )}
          </div>

          <div className="relative space-y-6">
            <div className="absolute bottom-0 left-6 top-0 w-px bg-[#1E1E38]" />

            {loading ? (
              <div className="flex justify-center py-20 text-[#5A5A80] animate-pulse">Loading your mindset...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-[#1E1E38] py-20 text-center">
                <Lightbulb className="mx-auto mb-3 text-[#F0B429]" size={28} />
                <p className="font-medium text-[#5A5A80]">No reflections match this view.</p>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const mood = moodMeta(entry.mood);
                return (
                  <div key={entry.id} className="group relative pl-14">
                    <div className="absolute left-4 top-2 z-10 h-4 w-4 rounded-full border-2 border-[#F0B429] bg-[#0D0D1A] transition-transform group-hover:scale-125" />

                    <Card className="group border-[#1E1E38] bg-[#080810] p-5 transition-colors hover:border-[#F0B429]/30">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${mood.bg} ${mood.color}`}>
                            {mood.icon} {mood.label}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-[#5A5A80]">
                            <Calendar size={12} /> {parseEntryDate(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-[#5A5A80] opacity-0 transition-colors hover:text-red-400 group-hover:opacity-100"
                          aria-label="Delete reflection"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#F0F0FF]">
                        {entry.content || "No reflection text saved."}
                      </p>
                    </Card>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-2xl animate-in fade-in zoom-in border-[#1E1E38] bg-[#0D0D1A] p-6 duration-200 sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white">New Psychology Entry</h3>
                  <p className="mt-1 text-sm text-[#5A5A80]">Be honest with yourself. The truth is where the growth is.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="rounded-xl bg-[#111124] p-2 text-[#8080A0] hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">Current State</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MOOD_TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        onClick={() => setSelectedMood(tag.value)}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                          selectedMood === tag.value
                            ? `border-[#F0B429] bg-[#F0B429]/10 ${tag.color}`
                            : "border-[#1E1E38] bg-[#111120] text-[#A0A0C0] hover:border-[#2E2E4D]"
                        }`}
                      >
                        {tag.icon} {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">Reflection Prompts</label>
                    <span className="text-[10px] text-[#5A5A80]">Tap to add</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {REFLECTION_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => applyPrompt(prompt)}
                        className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-3 text-left text-xs leading-5 text-zinc-300 transition hover:border-[#F0B429]/30 hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">Reflection</label>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="What did you feel? Why did you break a rule? How did you handle the win/loss?"
                    className="h-44 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#111120] p-4 text-sm text-[#F0F0FF] outline-none transition-all focus:border-[#F0B429]"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-[#1E1E38] py-3 text-sm font-black text-[#A0A0C0] transition-colors hover:bg-[#1E1E38]/30 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!content.trim() || saving}
                    className="gold-gradient flex-[2] rounded-xl py-3 text-sm font-black text-[#080810] transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 size={15} className="animate-spin" /> Saving...
                      </span>
                    ) : (
                      "Save Reflection"
                    )}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
