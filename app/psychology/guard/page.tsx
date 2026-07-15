"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades, getJournals } from "@/lib/db";
import { Trade } from "@/types/trade";
import { 
  Brain, 
  Activity, 
  ShieldAlert, 
  Heart, 
  Compass, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Frown,
  Smile,
  Zap,
  Info
} from "lucide-react";

type RiskDiagnosis = {
  score: number;
  level: "SAFE" | "CAUTION" | "HIGH TILT RISK";
  color: string;
  bg: string;
  advice: string;
  leaks: string[];
};

export default function PsychologyDashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-In Form State
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [discipline, setDiscipline] = useState(5);
  const [customGuard, setCustomGuard] = useState<RiskDiagnosis | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [tradeRows, journalRows] = await Promise.all([
          getTrades(user.id),
          getJournals(user.id)
        ]);
        setTrades(tradeRows);
        setJournals(journalRows);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Calculate dynamic behavioral insights
  const insights = () => {
    const closed = trades.filter(t => t.result !== "" && t.result !== null);
    
    // Streak check
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

    // Emotions correlation with losses
    const emotionalLosses = trades.filter(t => Number(t.result || 0) < 0 && t.emotion);
    const emotionFreq: Record<string, number> = {};
    emotionalLosses.forEach(t => {
      emotionFreq[t.emotion!] = (emotionFreq[t.emotion!] || 0) + 1;
    });
    const leakEmotion = Object.entries(emotionFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || "None detected";

    return {
      streak,
      streakType: currentStreakType,
      leakEmotion,
      totalJournals: journals.length,
      recentMood: journals[0]?.mood || "neutral"
    };
  };

  const runDiagnosis = () => {
    const info = insights();
    let score = 30; // base rating

    // Elevate score based on psychology inputs
    if (stress > 7) score += 25;
    if (sleep < 5) score += 20;
    if (discipline < 5) score += 20;

    // Elevate based on historical streak
    if (info.streakType === "loss" && info.streak >= 2) {
      score += 15; // Revenge trade risk after losses
    }

    let level: "SAFE" | "CAUTION" | "HIGH TILT RISK" = "SAFE";
    let color = "text-[#00D084]";
    let bg = "bg-[#00D084]/10";
    let advice = "You are in an optimal psychological zone. Follow your rules and take A+ setups only.";
    const leaks: string[] = [];

    if (score >= 70) {
      level = "HIGH TILT RISK";
      color = "text-[#FF4565]";
      bg = "bg-[#FF4565]/10 animate-pulse";
      advice = "WARNING: System locks recommended. Lower your maximum position size by 50% or trade only on DEMO mode today. Avoid XAUUSD or NQ indices.";
      
      if (stress > 7) leaks.push("High stress levels can lead to hasty exits.");
      if (sleep < 5) leaks.push("Poor sleep quality degrades impulse control.");
      if (info.streakType === "loss") leaks.push("Active loss streak may trigger a micro-revenge cycle.");
    } else if (score >= 45) {
      level = "CAUTION";
      color = "text-[#F0B429]";
      bg = "bg-[#F0B429]/10";
      advice = "Maintain tight discipline. Do not add to positions on drawdown. Pause for 15 minutes if you take a loss.";
      if (discipline < 6) leaks.push("Low self-reported discipline score.");
    }

    setCustomGuard({
      score,
      level,
      color,
      bg,
      advice,
      leaks
    });
  };

  if (!user) return null;
  const info = insights();

  return (
    <AppShell title="AI Risk-Guard" subtitle="Real-time Cognitive Check-in Terminal">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Banner */}
        <Card className="relative overflow-hidden p-6 border-[#F0B429]/30 bg-[#111124]/80">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#F0B429]/10 blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F0B429] flex items-center gap-1.5">
                <Brain size={14} /> AI Cognitive Co-pilot
              </span>
              <h1 className="text-2xl font-black mt-2 tracking-tight">The AI Risk-Guard Terminal</h1>
              <p className="text-xs text-[#A0A0C0] mt-1 max-w-xl">
                This diagnostic matches your current mental fatigue score with your historical streak telemetry to prevent overtrading and tilt locks before they blow your accounts.
              </p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <div className="bg-[#0D0D1A] rounded-xl border border-[#1E1E38] p-3 text-center min-w-[100px]">
                <p className="text-[9px] text-[#5A5A80] font-black uppercase">Loss Streak</p>
                <p className={`text-lg font-black mt-1 ${info.streakType === "loss" ? "text-[#FF4565]" : "text-zinc-500"}`}>
                  {info.streakType === "loss" ? `${info.streak}L` : "0"}
                </p>
              </div>
              <div className="bg-[#0D0D1A] rounded-xl border border-[#1E1E38] p-3 text-center min-w-[100px]">
                <p className="text-[9px] text-[#5A5A80] font-black uppercase">Major Leak</p>
                <p className="text-sm font-black mt-1.5 text-orange-400 truncate max-w-[90px]" title={info.leakEmotion}>
                  {info.leakEmotion}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Check-In Sliders */}
          <Card className="p-6 space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Activity size={16} className="text-[#F0B429]" />
              Initialize Session Check-In
            </h2>
            
            <div className="space-y-4">
              {/* Stress Slider */}
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
                <div className="flex justify-between text-[9px] text-[#5A5A80] mt-1">
                  <span>Relaxed / Serene</span>
                  <span>Extremely Stressed</span>
                </div>
              </div>

              {/* Sleep Slider */}
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
                <div className="flex justify-between text-[9px] text-[#5A5A80] mt-1">
                  <span>Exhausted / Foggy</span>
                  <span>Fully Energized</span>
                </div>
              </div>

              {/* Discipline Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#A0A0C0] font-bold">Emotional Discipline Rating</span>
                  <span className="text-white font-black">{discipline}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" value={discipline}
                  onChange={e => setDiscipline(Number(e.target.value))}
                  className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                />
                <div className="flex justify-between text-[9px] text-[#5A5A80] mt-1">
                  <span>Impulsive / Greed</span>
                  <span>Strict Rule Follower</span>
                </div>
              </div>
            </div>

            <button 
              onClick={runDiagnosis}
              className="w-full gold-gradient py-3.5 rounded-xl text-[#080810] font-black text-sm transition hover:scale-[1.01] active:scale-95 shadow-md shadow-[#F0B429]/10"
            >
              Run AI Diagnostics
            </button>
          </Card>

          {/* Results Area */}
          <Card className="p-6 flex flex-col justify-between min-h-[340px]">
            {customGuard ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#5A5A80]">Cognitive Diagnosis</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${customGuard.bg} ${customGuard.color}`}>
                    {customGuard.level}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${customGuard.color}`}>{customGuard.score}</span>
                  <span className="text-xs text-[#5A5A80] font-medium">/ 100 Tilt Index</span>
                </div>

                <div className="border-t border-[#1E1E38] pt-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#5A5A80] mb-1.5">AI Intervention Advice</p>
                  <p className="text-sm leading-relaxed text-zinc-300">{customGuard.advice}</p>
                </div>

                {customGuard.leaks.length > 0 && (
                  <div className="border-t border-[#1E1E38] pt-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#5A5A80] mb-1.5">Active Behavioral Leaks</p>
                    <ul className="space-y-1 text-xs text-[#FF4565] font-semibold">
                      {customGuard.leaks.map((leak, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <AlertCircle size={12} /> {leak}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center my-auto py-10">
                <ShieldAlert size={36} className="text-[#5A5A80] mb-3 animate-pulse" />
                <p className="text-sm font-bold text-white">Diagnostics Offline</p>
                <p className="text-xs text-[#5A5A80] mt-1 max-w-[240px]">
                  Fill in your current psychological indicators and tap Run AI Diagnostics to analyze your focus envelope.
                </p>
              </div>
            )}

            <div className="border-t border-[#1E1E38] pt-3 text-[10px] text-[#5A5A80] flex items-center gap-1.5">
              <Info size={12} />
              Pre-trade checklist integrated with your active profile.
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
