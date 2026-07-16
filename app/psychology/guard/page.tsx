"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveShift, getRecentShifts, clockIn, clockOut, TraderShift } from "@/lib/shifts-db";
import { getTrades } from "@/lib/db";
import { Trade } from "@/types/trade";
import { ActiveShiftTerminal } from "@/components/backtesting/ActiveShiftTerminal";
import { 
  Brain, 
  Activity, 
  Clock, 
  LogIn, 
  Calendar,
  Heart,
  ChevronRight
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
  const [targetProfit, setTargetProfit] = useState(500);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState(250);

  // Detailed Modal overlay for read-more day stats in historical fallback view
  const [selectedDayShift, setSelectedDayShift] = useState<TraderShift | null>(null);

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
        preNotes,
        targetProfit,
        maxDrawdownLimit
      });
      await loadData();
    } finally {
      setActionLoading(false);
    }
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

  return (
    <AppShell title="AI Risk-Guard" subtitle="Cognitive check-in shift manager.">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Institutional Banner */}
        <Card className="relative overflow-hidden p-8 border-[#F0B429]/30 bg-[#0D0D16]/90 shadow-2xl shadow-black/20">
          <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#F0B429]/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#F0B429]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F0B429] animate-pulse" />
                Cognitive Shift Manager
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.95] text-white">
                AI Risk-Guard
              </h1>
              <p className="text-sm text-[#A0A0C0] max-w-xl leading-relaxed">
                Professional trading session management. Clock in with full cognitive diagnostics, execute with verified playbook rules, and receive institutional-grade behavioral analysis powered by Claude AI.
              </p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <div className={`rounded-2xl border px-6 py-5 text-center min-w-[160px] backdrop-blur-sm ${activeShift ? "border-[#00D084]/40 bg-[#00D084]/5" : "border-[#1E1E38] bg-[#0D0D1A]/60"}`}>
                <p className="text-[9px] text-[#5A5A80] font-black uppercase tracking-[0.15em] mb-2">Shift Status</p>
                <p className={`text-xl font-black flex items-center justify-center gap-2 ${activeShift ? "text-[#00D084]" : "text-zinc-500"}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${activeShift ? "bg-[#00D084] animate-pulse" : "bg-zinc-500"}`} />
                  {activeShift ? "ACTIVE" : "OFF-DUTY"}
                </p>
                {activeShift && (
                  <p className="text-[10px] text-[#5A5A80] mt-2 font-mono">
                    {new Date(activeShift.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-20 text-[#5A5A80]">Initializing terminal…</div>
        ) : activeShift ? (
          <ActiveShiftTerminal activeShift={activeShift} onStateChange={loadData} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            
            {/* Main Interactive Screen */}
            <div className="space-y-6">
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
                  {/* Targets fully aligned on mobile/desktop */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2 leading-none">Today's Profit Target ($)</label>
                      <input 
                        type="number"
                        value={targetProfit}
                        onChange={e => setTargetProfit(Number(e.target.value))}
                        className="w-full h-11 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 text-xs text-white outline-none focus:border-[#F0B429] font-bold"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2 leading-none">Daily Loss Limit ($)</label>
                      <input 
                        type="number"
                        value={maxDrawdownLimit}
                        onChange={e => setMaxDrawdownLimit(Number(e.target.value))}
                        className="w-full h-11 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 text-xs text-white outline-none focus:border-[#F0B429] font-bold"
                      />
                    </div>
                  </div>

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
            </div>

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
                          <div className="flex gap-2">
                            <span className="text-[#F0B429] font-black uppercase text-[9px]">
                              {shift.sessionDurationMinutes ? `${Math.floor(shift.sessionDurationMinutes / 60)}h ${shift.sessionDurationMinutes % 60}m` : "—"}
                            </span>
                            <span className="text-[#00D084] font-black uppercase">
                              Discipline: {shift.postDiscipline}/10
                            </span>
                          </div>
                        </div>

                        {shift.behavioralSummary && (
                          <div className="p-2.5 bg-[#151522] rounded-lg border border-[#24243C] text-[11px] leading-relaxed text-zinc-300">
                            <p className="font-semibold text-[10px] text-[#F0B429] flex items-center gap-1 mb-1.5">
                              <Heart size={10} /> AI HUMAN ANALYSIS
                            </p>
                            <span className="line-clamp-3">{shift.behavioralSummary}</span>
                            
                            <button 
                              onClick={() => setSelectedDayShift(shift)}
                              className="w-full mt-3 py-1.5 bg-[#1C1C30]/50 hover:bg-[#1C1C30] rounded-lg text-[10px] font-bold text-[#F0B429] flex items-center justify-center gap-1 transition"
                            >
                              Read Full Report <ChevronRight size={10} />
                            </button>
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

      {/* DETAILED DAILY SHIFT OVERLAY FOR OFF-DUTY ARCHIVE VIEW */}
      {selectedDayShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <Card className="w-full max-w-2xl bg-[#0F0F1E] border border-[#24243C] p-6 sm:p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-center justify-between border-b border-[#1E1E38] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0B429]/10 flex items-center justify-center text-[#F0B429]">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">AI Shift Analysis — {new Date(selectedDayShift.clockIn).toLocaleDateString()}</h3>
                  <p className="text-xs text-[#5A5A80]">Full performance review & deep cognitive feedback</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDayShift(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A26] text-zinc-400 hover:text-white transition"
              >
                Close ×
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#14142B] border border-[#24243C]">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#F0B429] mb-1.5">CLAUDE CO-PILOT ADVICE</p>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 italic">
                  {selectedDayShift.behavioralSummary || "No summary recorded."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#0D0D1A] rounded-xl border border-[#1E1E38]">
                  <p className="text-[9px] text-[#5A5A80] font-black uppercase">Discipline Rating</p>
                  <p className="text-sm font-black text-[#00D084] mt-1">{selectedDayShift.postDiscipline || 0}/10</p>
                </div>
                <div className="p-3 bg-[#0D0D1A] rounded-xl border border-[#1E1E38]">
                  <p className="text-[9px] text-[#5A5A80] font-black uppercase">Initial Stress</p>
                  <p className="text-sm font-black text-white mt-1">{selectedDayShift.stressLevel}/10</p>
                </div>
                <div className="p-3 bg-[#0D0D1A] rounded-xl border border-[#1E1E38]">
                  <p className="text-[9px] text-[#5A5A80] font-black uppercase">Daily Loss Limit</p>
                  <p className="text-sm font-black text-[#FF4565] mt-1">${selectedDayShift.maxDrawdownLimit || 0}</p>
                </div>
                <div className="p-3 bg-[#0D0D1A] rounded-xl border border-[#1E1E38]">
                  <p className="text-[9px] text-[#5A5A80] font-black uppercase">Profit Target</p>
                  <p className="text-sm font-black text-[#00D084] mt-1">${selectedDayShift.targetProfit || 0}</p>
                </div>
                <div className="p-3 bg-[#0D0D1A] rounded-xl border border-[#1E1E38]">
                  <p className="text-[9px] text-[#5A5A80] font-black uppercase">Session Duration</p>
                  <p className="text-sm font-black text-[#F0B429] mt-1">{selectedDayShift.sessionDurationMinutes ? `${Math.floor(selectedDayShift.sessionDurationMinutes / 60)}h ${selectedDayShift.sessionDurationMinutes % 60}m` : "—"}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedDayShift(null)}
                className="w-full bg-[#1A1A26] hover:bg-[#222234] py-3 rounded-xl text-xs font-black text-zinc-300 transition"
              >
                Close Detailed View
              </button>
            </div>
          </Card>
        </div>
      )}

    </AppShell>
  );
}
