"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJournals, saveJournal, deleteJournal } from "@/lib/firestore";
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
  Calendar
} from "lucide-react";

// Psychology-specific tags
const MOOD_TAGS = [
  { label: "Disciplined", icon: <ShieldCheck size={14} />, color: "text-[#00D084]", bg: "bg-[#00D084]/10", value: "disciplined" },
  { label: "Anxious", icon: <AlertCircle size={14} />, color: "text-orange-400", bg: "bg-orange-400/10", value: "anxious" },
  { label: "Greedy", icon: <Zap size={14} />, color: "text-red-400", bg: "bg-red-400/10", value: "greedy" },
  { label: "Calm", icon: <Smile size={14} />, color: "text-blue-400", bg: "bg-blue-400/10", value: "calm" },
  { label: "Frustrated", icon: <Frown size={14} />, color: "text-purple-400", bg: "bg-purple-400/10", value: "frustrated" },
  { label: "Neutral", icon: <Meh size={14} />, color: "text-[#A0A0C0]", bg: "bg-[#A0A0C0]/10", value: "neutral" },
];

export default function PsychologyPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState("neutral");

  useEffect(() => {
    async function loadJournals() {
      if (!user) return;
      const data = await getJournals(user.uid);
      setEntries(data);
      setLoading(false);
    }
    loadJournals();
  }, [user]);

  async function handleSave() {
    if (!content.trim()) return;
    
    const newEntry = {
      date: new Date().toISOString(),
      content,
      mood: selectedMood,
      uid: user?.uid,
    };

    await saveJournal(user!.uid, newEntry);
    setEntries([newEntry, ...entries]);
    setContent("");
    setSelectedMood("neutral");
    setIsModalOpen(false);
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this reflection?")) {
      await deleteJournal(user!.uid, id);
      setEntries(entries.filter(e => e.id !== id));
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Psychology Journal" subtitle="The Mindset Terminal">
      <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6 p-4">
        
        {/* Top Action Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Brain className="text-[#F0B429]" /> Mindset Archive
            </h2>
            <p className="text-sm text-[#5A5A80]">Track your emotional patterns to build an unbreakable edge.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="gold-gradient px-5 py-3 rounded-xl text-[#080810] font-black text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-[0_0_15px_rgba(240,180,41,0.3)]"
          >
            <Plus size={18} /> New Reflection
          </button>
        </div>

        {/* Mindset Summary Section */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  {MOOD_TAGS.map((tag) => {
    const count = entries.filter(e => e.mood === tag.value).length;
    const percentage = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
    
    return (
      <Card key={tag.value} className="p-4 bg-[#0D0D1A]/40 border-[#1E1E38] flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#5A5A80]">
          {tag.icon}
          <span className="text-[10px] font-black uppercase tracking-tighter">{tag.label}</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-black text-white">{percentage}%</span>
          <div className="w-16 h-1 bg-[#1E1E38] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${tag.bg.replace('/10', '')}`} 
              style={{ width: `${percentage}%` }} 
            />
          </div>
        </div>
      </Card>
    );
  })}
</div>

        {/* Timeline of Entries */}
        <div className="space-y-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-[#1E1E38]" />

          {loading ? (
            <div className="flex justify-center py-20 text-[#5A5A80] animate-pulse">Loading your mindset...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[#1E1E38] rounded-3xl">
              <p className="text-[#5A5A80] font-medium">No reflections yet. Start documenting your journey.</p>
            </div>
          ) : (
            entries.map((entry) => {
              const mood = MOOD_TAGS.find(m => m.value === entry.mood) || MOOD_TAGS[5];
              return (
                <div key={entry.id} className="relative pl-14 group">
                  {/* Timeline Dot */}
                  <div className="absolute left-4 top-2 w-4 h-4 rounded-full bg-[#0D0D1A] border-2 border-[#F0B429] z-10 group-hover:scale-125 transition-transform" />
                  
                  <Card className="bg-[#0D0D1A]/60 backdrop-blur-md border-[#1E1E38] p-5 hover:border-[#F0B429]/30 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${mood.bg} ${mood.color}`}>
                          {mood.icon} {mood.label}
                        </span>
                        <span className="text-[11px] text-[#5A5A80] flex items-center gap-1">
                          <Calendar size={12} /> {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        className="text-[#5A5A80] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-[#F0F0FF] leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </Card>
                </div>
              );
            })
          )}
        </div>

        {/* Entry Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="w-full max-w-xl bg-[#0D0D1A] border-[#1E1E38] p-8 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-black text-white mb-2">New Psychology Entry</h3>
              <p className="text-sm text-[#5A5A80] mb-6">Be honest with yourself. The truth is where the growth is.</p>
              
              <div className="space-y-6">
                {/* Mood Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-3">Current State</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MOOD_TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        onClick={() => setSelectedMood(tag.value)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
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

                {/* Content */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-3">Reflection</label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What did you feel? Why did you break a rule? How did you handle the win/loss?"
                    className="w-full h-40 bg-[#111120] border border-[#1E1E38] rounded-2xl p-4 text-sm text-[#F0F0FF] outline-none focus:border-[#F0B429] transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-[#1E1E38] text-sm font-black text-[#A0A0C0] hover:bg-[#1E1E38]/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!content.trim()}
                    className="flex-[2] gold-gradient py-3 rounded-xl text-[#080810] text-sm font-black disabled:opacity-50 transition-transform active:scale-95"
                  >
                    Save Reflection
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