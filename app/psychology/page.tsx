"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJournals, saveJournal, deleteJournal } from "@/lib/db";
import { JournalEntry } from "@/types/journal";
import {
  Brain,
  Plus,
  Trash2,
  Smile,
  Frown,
  Meh,
  Zap,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";

const MOOD_TAGS = [
  { label: "Disciplined", icon: <ShieldCheck size={14} />, color: "text-[#00D084]", bg: "bg-[#00D084]/10", value: "disciplined" },
  { label: "Anxious", icon: <AlertCircle size={14} />, color: "text-orange-400", bg: "bg-orange-400/10", value: "anxious" },
  { label: "Greedy", icon: <Zap size={14} />, color: "text-red-400", bg: "bg-red-400/10", value: "greedy" },
  { label: "Calm", icon: <Smile size={14} />, color: "text-blue-400", bg: "bg-blue-400/10", value: "calm" },
  { label: "Frustrated", icon: <Frown size={14} />, color: "text-purple-400", bg: "bg-purple-400/10", value: "frustrated" },
  { label: "Neutral", icon: <Meh size={14} />, color: "text-[#A0A0C0]", bg: "bg-[#A0A0C0]/10", value: "neutral" },
];

type PsychologyEntry = JournalEntry & {
  content: string;
};

function todayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeEntry(entry: JournalEntry): PsychologyEntry {
  return {
    ...entry,
    content: entry.entry || entry.text || entry.notes || "",
  };
}

export default function PsychologyPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PsychologyEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("neutral");

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

  async function handleSave() {
    if (!user || !content.trim() || saving) return;

    const cleanContent = content.trim();
    setSaving(true);
    setError("");

    try {
      const id = await saveJournal(user.id, {
        date: todayDate(),
        mood: selectedMood,
        entry: cleanContent,
        text: cleanContent,
        notes: cleanContent,
        tags: [selectedMood],
      });

      const savedEntry: PsychologyEntry = {
        id,
        date: todayDate(),
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

  if (!user) return null;

  return (
    <AppShell title="Psychology Journal" subtitle="The Mindset Terminal">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-black text-white">
              <Brain className="text-[#F0B429]" /> Mindset Archive
            </h2>
            <p className="text-sm text-[#5A5A80]">Track your emotional patterns to build an unbreakable edge.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="gold-gradient flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-[#080810] shadow-[0_0_15px_rgba(240,180,41,0.3)] transition-transform active:scale-95"
          >
            <Plus size={18} /> New Reflection
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-sm font-bold text-[#FF4565]">
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {MOOD_TAGS.map((tag) => {
            const count = entries.filter((entry) => entry.mood === tag.value).length;
            const percentage = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;

            return (
              <Card key={tag.value} className="flex flex-col gap-2 border-[#1E1E38] bg-[#0D0D1A]/40 p-4">
                <div className="flex items-center gap-2 text-[#5A5A80]">
                  {tag.icon}
                  <span className="text-[10px] font-black uppercase tracking-tighter">{tag.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black text-white">{percentage}%</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-[#1E1E38]">
                    <div className={`h-full transition-all duration-1000 ${tag.bg.replace('/10', '')}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="relative space-y-6">
          <div className="absolute bottom-0 left-6 top-0 w-px bg-[#1E1E38]" />

          {loading ? (
            <div className="flex justify-center py-20 text-[#5A5A80] animate-pulse">Loading your mindset...</div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-[#1E1E38] py-20 text-center">
              <p className="font-medium text-[#5A5A80]">No reflections yet. Start documenting your journey.</p>
            </div>
          ) : (
            entries.map((entry) => {
              const mood = MOOD_TAGS.find((item) => item.value === entry.mood) || MOOD_TAGS[5];
              return (
                <div key={entry.id} className="group relative pl-14">
                  <div className="absolute left-4 top-2 z-10 h-4 w-4 rounded-full border-2 border-[#F0B429] bg-[#0D0D1A] transition-transform group-hover:scale-125" />

                  <Card className="group border-[#1E1E38] bg-[#0D0D1A]/60 p-5 backdrop-blur-md transition-colors hover:border-[#F0B429]/30">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${mood.bg} ${mood.color}`}>
                          {mood.icon} {mood.label}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#5A5A80]">
                          <Calendar size={12} /> {new Date(`${entry.date}T12:00:00`).toLocaleDateString()}
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

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-xl animate-in fade-in zoom-in border-[#1E1E38] bg-[#0D0D1A] p-8 duration-200">
              <h3 className="mb-2 text-xl font-black text-white">New Psychology Entry</h3>
              <p className="mb-6 text-sm text-[#5A5A80]">Be honest with yourself. The truth is where the growth is.</p>

              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">Current State</label>
                  <div className="grid grid-cols-3 gap-2">
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
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-[#5A5A80]">Reflection</label>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="What did you feel? Why did you break a rule? How did you handle the win/loss?"
                    className="h-40 w-full resize-none rounded-2xl border border-[#1E1E38] bg-[#111120] p-4 text-sm text-[#F0F0FF] outline-none transition-all focus:border-[#F0B429]"
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