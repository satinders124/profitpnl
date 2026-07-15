"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveShift, getRecentShifts, clockIn, clockOut, TraderShift } from "@/lib/shifts-db";
import { getTrades } from "@/lib/db";
import { Trade } from "@/types/trade";
import { 
  Brain, 
  Activity, 
  ShieldAlert, 
  Clock, 
  Coffee, 
  LogOut, 
  LogIn, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Frown,
  Smile,
  Zap,
  Info,
  Calendar,
  CheckCircle2,
  Heart
} from "lucide-react";

type RiskDiagnosis = {
  score: number;
  level: "SAFE" | "CAUTION" | "HIGH TILT RISK";
  color: string;
  bg: string;
  advice: string;
  leaks: string[];
};

export default function PwaPsychologyGuardPage() {
  const { user } = useAuth();
  
  // Shift state
  const [activeShift, setActiveShift] = useState<TraderShift | null>(null);
  const [recentShifts, setRecentShifts] = useState<TraderShift[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Clock-in form variables
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [discipline, setDiscipline] = useState(5);
  const [preNotes, setPreNotes] = useState("");

  // Clock-out form variables
  const [postDiscipline, setPostDiscipline] = useState(5);
  const [emotionsFelt, setEmotionsFelt] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");

  // UI state
  const [diagnosed, setDiagnosed] = useState<RiskDiagnosis | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [active, recent, tradeRows] = await Promise.all([
        getActiveShift(user.id),
        getRecentShifts(user.id),
        getTrades(user.id)
      ]);
      setActiveShift(active);
      setRecentShifts(recent);
      setTrades(tradeRows);
    } catch (err) {
      console.error("Load shifts data error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Dynamic calculations
  const insights = () => {
    const closed = trades.filter(t => t.result !== "" && t.result !== null);
    let streak = 0;
    let currentStreakType: "win" | "loss" | "neutral" = "neutral";
    for (let i = 0; i < closed.length; i++) {
      const r = Number(closed[i].result || 0);
      if (r > 0) {
        if (currentStreakType === "win" || currentStreakType === "neutral") {
          currentStreakType = "win";
          streak++;
        } else break;
      } else if (r < 0) {
        if (currentStreakType === "loss" || currentStreakType === "neutral") {
          currentStreakType = "loss";
          streak++;
        } else break;
      }
    }

    const emotionalLosses = trades.filter(t => Number(t.result || 0) < 0 && t.emotion);
    const emotionFreq: Record<string, number> = {};
    emotionalLosses.forEach(t => {
      emotionFreq[t.emotion!] = (emotionFreq[t.emotion!] || 0) + 1;
    });
    const leakEmotion = Object.entries(emotionFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "None detected";

    return {
      streak,
      streakType: currentStreakType,
      leakEmotion
    };
  };

  const handleClockIn = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await clockIn(user.id, {
        sleepQuality: sleep,
        stressLevel: stress,
        disciplineLevel: discipline,
        preNotes
      });
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !activeShift) return;
    setActionLoading(true);
    try {
      // Generate AI-Style cognitive analysis paragraph
      const summary = generateAIParentSummary();
      await clockOut(user.id, activeShift.id, {
        postDiscipline,
        emotionsFelt,
        lessonsLearned,
        behavioralSummary: summary
      });
      // Clear forms
      setEmotionsFelt("");
      setLessonsLearned("");
      setPreNotes("");
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const generateAIParentSummary = (): string => {
    const diff = postDiscipline - activeShift!.disciplineLevel;
    const moodNote = emotionsFelt ? `experiencing feelings of ${emotionsFelt.toLowerCase()}` : "retaining structural focus";
    let base = `During this session, you operated with a starting stress rating of ${activeShift!.stressLevel}/10 and closed out with a discipline score of ${postDiscipline}/10. You noted ${moodNote}. `;
    
    if (diff > 0) {
      base += "You showed highly impressive focus elevation! Your self-restraint improved as the session unfolded, successfully protecting your equity against early trigger responses.";
    } else if (diff < 0) {
      base += "Caution is advised. Your discipline rating degraded by the end of the shift, hinting that decision fatigue or emotional exhaustion influenced your trade executions. Take a complete pause from the market.";
    } else {
      base += "You displayed extremely consistent behavioral boundaries. Maintaining this emotional equilibrium is exactly what isolates professional execution from amateur cycles.";
    }

    if (lessonsLearned) {
      base += ` You noted a vital takeaway: "${lessonsLearned}". Remember to carry this rule explicitly into your next clock-in session.`;
    }
    return base;
  };

  // Run initial pre-trade check
  const calculatePreRisk = () => {
    const info = insights();
    let score = 30;
    if (stress > 7) score += 25;
    if (sleep < 5) score += 20;
    if (discipline < 5) score += 20;
    if (info.streakType === "loss" && info.streak >= 2) score += 15;

    let level: "SAFE" | "CAUTION" | "HIGH TILT RISK" = "SAFE";
    let color = "text-[#00D084]";
    let bg = "bg-[#00D084]/10";
    let advice = "You are in an optimal psychological zone. Follow your rules and take A+ setups only.";
    const leaks: string[] = [];

    if (score >= 70) {
      level = "HIGH TILT RISK";
      color = "text-[#FF4565]";
      bg = "bg-[#FF4565]/10 animate-pulse";
      advice = "WARNING: System locks recommended. Lower your maximum position size by 50% or trade only on DEMO mode today. Avoid volatile pairs.";
      if (stress > 7) leaks.push("High stress levels can lead to hasty exits.");
      if (sleep < 5) leaks.push("Poor sleep quality degrades impulse control.");
    } else if (score >= 45) {
      level = "CAUTION";
      color = "text-[#F0B429]";
      bg = "bg-[#F0B429]/10";
      advice = "Maintain tight discipline. Do not add to positions on drawdown. Pause for 15 minutes if you take a loss.";
    }

    setDiagnosed({ score, level, color, bg, advice, leaks });
  };

  if (!user) return null;
  const info = insights();

  return (
    <AppShell title="Trader Check-In Terminal" subtitle="Humanized Session co-pilot & active risk guard.">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner */}
        <Card className="relative overflow-hidden p-6 border-[#F0B429]/30 bg-[#111124]/80">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#F0B429]/10 blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F0B429] flex items-center gap-1.5">
                <Brain size={14} /> Cognitive Shift Manager
              </span>
              <h1 className="text-2xl font-black mt-2 tracking-tight">Active Clock-In Terminal</h1>
              <p className="text-xs text-[#A0A0C0] mt-1 max-w-xl">
                Treat your trading as a professional job. Clock-in before your sessions, run your AI risk evaluations, trade, and clock-out to receive a humanized AI behavioral breakdown.
              </p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <div className={`rounded-xl border p-4 text-center min-w-[130px] flex flex-col justify-center ${activeShift ? "border-[#00D084]/30 bg-[#00D084]/5" : "border-[#1E1E38] bg-[#0D0D1A]"}`}>
                <p className="text-[9px] text-[#5A5A80] font-black uppercase tracking-wider">Shift Status</p>
                <p className={`text-sm font-black mt-1 flex items-center justify-center gap-1.5 ${activeShift ? "text-[#00D084]" : "text-zinc-500"}`}>
                  <span className={`w-2 h-2 rounded-full ${activeShift ? "bg-[#00D084] animate-pulse" : "bg-zinc-500"}`} />
                  {activeShift ? "ACTIVE SHIFT" : "OFF-DUTY"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-20 text-[#5A5A80]">Initializing terminal…</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            
            {/* Main Interactive Screen */}
            <div className="space-y-6">
              
              {/* NOT CLOCKED IN YET */}
              {!activeShift && (
                <Card className="p-6 space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#1E1E38] pb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F0B429]/10 flex items-center justify-center text-[#F0B429]">
                      <LogIn size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black">Pre-Session Diagnostics</h2>
                      <p className="text-xs text-[#5A5A80]">Complete your check-in sliders to start your professional shift.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#A0A0C0] font-bold">Sleep Quality & Alertness</span>
                        <span className="text-white font-black">{sleep}/10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" value={sleep}
                        onChange={e => setSleep(Number(e.target.value))}
                        className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#A0A0C0] font-bold">Mental Stress & Pressure</span>
                        <span className="text-white font-black">{stress}/10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" value={stress}
                        onChange={e => setStress(Number(e.target.value))}
                        className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#A0A0C0] font-bold">Self-Discipline Rating</span>
                        <span className="text-white font-black">{discipline}/10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" value={discipline}
                        onChange={e => setDiscipline(Number(e.target.value))}
                        className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2">Pre-Shift Focus Notes</label>
                      <textarea
                        value={preNotes}
                        onChange={e => setPreNotes(e.target.value)}
                        placeholder="Write your plan (e.g. 'Trade only London Open, maximum 1 entry')"
                        className="w-full h-20 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl p-3 text-xs text-white outline-none focus:border-[#F0B429]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={calculatePreRisk}
                        className="flex-1 py-3 rounded-xl border border-[#1E1E38] text-xs font-black text-[#A0A0C0] hover:bg-[#1E1E38]/30"
                      >
                        Calculate Pre-Risk
                      </button>
                      <button 
                        onClick={handleClockIn}
                        disabled={actionLoading}
                        className="flex-[2] gold-gradient py-3 rounded-xl text-[#080810] font-black text-xs flex items-center justify-center gap-2"
                      >
                        <Clock size={15} /> Clock-In Session
                      </button>
                    </div>

                    {diagnosed && (
                      <div className={`p-4 rounded-xl border border-[#1E1E38] mt-3 space-y-2 ${diagnosed.bg}`}>
                        <div className="flex justify-between text-xs font-black uppercase">
                          <span>Focus Index: {diagnosed.score}/100</span>
                          <span className={diagnosed.color}>{diagnosed.level}</span>
                        </div>
                        <p className="text-xs text-zinc-300">{diagnosed.advice}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* ACTIVE ACTIVE SHIFT SCREEN */}
              {activeShift && (
                <Card className="p-6 space-y-6 border-[#00D084]/30 bg-[#0A1010]/30 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-[#1E1E38] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00D084]/10 flex items-center justify-center text-[#00D084]">
                        <Coffee size={20} className="animate-bounce" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">Active Shift Diagnostics</h2>
                        <p className="text-xs text-[#5A5A80]">Clocked-in at {new Date(activeShift.clockIn).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono2 text-[#00D084] font-black px-2 py-0.5 rounded bg-[#00D084]/10">LIVE ACTIVE</span>
                  </div>

                  {/* AI Risk Guard Active Warning */}
                  <div className="p-4 bg-[#1E1E38]/40 border border-[#24243C] rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-black text-[#F0B429] mb-1.5">
                      <Brain size={15} /> Active Co-pilot Mode
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      "I am actively monitoring your behavior, {user.email?.split('@')[0]}. You entered with stress level {activeShift.stressLevel}/10. Keep your position boundaries strict. Protect your equity above all else."
                    </p>
                  </div>

                  {/* Clock-out variables */}
                  <div className="space-y-4 pt-3 border-t border-[#1E1E38]">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Post-Session Evaluation</h3>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#A0A0C0] font-bold">Rate Your Execution Discipline</span>
                        <span className="text-white font-black">{postDiscipline}/10</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" value={postDiscipline}
                        onChange={e => setPostDiscipline(Number(e.target.value))}
                        className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2">Emotions Experienced During Trades</label>
                      <input 
                        value={emotionsFelt}
                        onChange={e => setEmotionsFelt(e.target.value)}
                        placeholder="e.g. FOMO, Patient, Confident, Greedy"
                        className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#F0B429]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2">Biggest Cognitive Lesson Learned</label>
                      <textarea
                        value={lessonsLearned}
                        onChange={e => setLessonsLearned(e.target.value)}
                        placeholder="e.g. 'I exited early because of fear — must trust my SL/TP targets.'"
                        className="w-full h-20 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl p-3 text-xs text-white outline-none focus:border-[#F0B429] resize-none"
                      />
                    </div>

                    <button 
                      onClick={handleClockOut}
                      disabled={actionLoading}
                      className="w-full bg-red-500 hover:bg-red-600 py-3.5 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2"
                    >
                      <LogOut size={15} /> Clock-Out & Summarize Shift
                    </button>
                  </div>
                </Card>
              )}

            </div>

            {/* Sidebar: Shift Calendar & Shift History */}
            <div className="space-y-6">
              
              <Card className="p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                  <Calendar size={14} className="text-[#F0B429]" />
                  Session Shift History
                </h3>

                {recentShifts.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 border border-dashed border-[#1E1E38] rounded-xl">
                    No completed shifts logged. Clock out to view.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
                    {recentShifts.map((shift) => (
                      <div key={shift.id} className="p-3.5 bg-[#0D0D1A] rounded-xl border border-[#1E1E38] space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-[#A0A0C0] font-bold flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(shift.clockIn).toLocaleDateString()}
                          </span>
                          <span className="text-[#00D084] font-black uppercase">
                            Discipline: {shift.postDiscipline}/10
                          </span>
                        </div>

                        {shift.behavioralSummary && (
                          <div className="p-2.5 bg-[#151522] rounded-lg border border-[#24243C] text-[11px] leading-relaxed text-zinc-300">
                            <p className="font-semibold text-[10px] text-[#F0B429] flex items-center gap-1 mb-1">
                              <Heart size={10} /> AI HUMAN ANALYSIS
                            </p>
                            {shift.behavioralSummary}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

            </div>

          </div>
        )}

      </div>
    </AppShell>
  );
}
