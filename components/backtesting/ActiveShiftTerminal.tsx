"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { getActiveShift, getRecentShifts, clockOut, TraderShift } from "@/lib/shifts-db";
import { getRunningTradesForShift, addRunningTrade, closeRunningTrade, RunningTrade } from "@/lib/running-trades-db";
import { getPlaybook, saveTrade } from "@/lib/db";
import { PlaybookSetup } from "@/types/playbook";
import { useAuth } from "@/components/providers/AuthProvider";
import { useNotificationCoPilot } from "@/components/providers/NotificationProvider";
import { 
  Brain, Clock, ShieldAlert, ArrowRight, Play, Check, AlertCircle, Info, ChevronRight, X, Sparkles, Smile, Trophy, Activity, LogOut, ChevronDown, ChevronUp, Calendar
} from "lucide-react";

export function ActiveShiftTerminal({
  activeShift,
  onStateChange
}: {
  activeShift: TraderShift;
  onStateChange: () => void;
}) {
  const { user } = useAuth();
  const { showCelebrate } = useNotificationCoPilot();

  const [runningTrades, setRunningTrades] = useState<RunningTrade[]>([]);
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>([]);
  const [recentShifts, setRecentShifts] = useState<TraderShift[]>([]);
  const [loading, setLoading] = useState(true);

  // New Trade Panel States
  const [isAdding, setIsAdding] = useState(false);
  const [strategyId, setStrategyId] = useState("");
  const [strategyName, setStrategyName] = useState("");
  const [rules, setRules] = useState<string[]>([]);
  const [rulesChecked, setRuleChecked] = useState<boolean[]>([]);

  // Prices State
  const [entry, setEntry] = useState(0);
  const [sl, setSl] = useState(0);
  const [tp, setTp] = useState(0);
  const [lotSize, setLotSize] = useState(1);
  const [pipsTicks, setPipsTicks] = useState(10);
  const [riskAmount, setRiskAmount] = useState(100);
  const [targetProfit, setTargetProfit] = useState(200);
  const [isCaution, setIsCaution] = useState(false);

  // Close Trade modal state
  const [closingTrade, setClosingTrade] = useState<RunningTrade | null>(null);
  const [exitPrice, setExitPrice] = useState(0);
  const [realizedPnl, setRealizedPnl] = useState(0);

  // Clock Out variables
  const [postDiscipline, setPostDiscipline] = useState(5);
  const [emotionsFelt, setEmotionsFelt] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");

  // Detailed Modal overlay for read-more day stats
  const [selectedDayShift, setSelectedDayShift] = useState<TraderShift | null>(null);
  const [dayTrades, setDayTrades] = useState<RunningTrade[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [trades, play, recent] = await Promise.all([
        getRunningTradesForShift(activeShift.id),
        getPlaybook(user.id),
        getRecentShifts(user.id)
      ]);
      setRunningTrades(trades);
      setPlaybook(play);
      setRecentShifts(recent);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, activeShift]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load trades specifically for the detailed shift overlay
  const handleOpenDetailedDay = async (shift: TraderShift) => {
    try {
      const trades = await getRunningTradesForShift(shift.id);
      setDayTrades(trades);
      setSelectedDayShift(shift);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle strategy picker change
  const handleStrategyChange = (id: string) => {
    setStrategyId(id);
    const selected = playbook.find(p => p.id === id);
    if (selected) {
      const selectedRules = selected.rules || [];
      setStrategyName(selected.name);
      setRules(selectedRules);
      setRuleChecked(new Array(selectedRules.length).fill(false));
    } else {
      setStrategyName("");
      setRules([]);
      setRuleChecked([]);
    }
  };

  // Monitor risk thresholds
  useEffect(() => {
    const dailyLimit = activeShift.maxDrawdownLimit || 10000;
    if (riskAmount > dailyLimit) {
      setIsCaution(true);
    } else {
      setIsCaution(false);
    }
  }, [riskAmount, activeShift]);

  const handleCreateRunningTrade = async () => {
    if (!user) return;
    try {
      const checkedRules = rules.filter((_, idx) => rulesChecked[idx]);
      await addRunningTrade(user.id, {
        shiftId: activeShift.id,
        strategyId: strategyId || null,
        strategyName: strategyName || "Manual Setup",
        rulesFollowed: checkedRules,
        entryPrice: entry,
        slPrice: sl,
        tpPrice: tp,
        riskAmount,
        potentialProfit: targetProfit,
        lotSize,
        pipsTicks,
        isCaution
      });
      showCelebrate("Trade Active! 🚀", `Your running trade for ${strategyName || "Manual Setup"} is now live on telemetry monitoring!`, "success");
      setIsAdding(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseRunningTrade = async () => {
    if (!user || !closingTrade) return;
    try {
      await closeRunningTrade(user.id, closingTrade.id, {
        exitPrice,
        pnlRealized: realizedPnl
      });
      showCelebrate(
        realizedPnl >= 0 ? "Profit Banked! 🏆" : "Risk Handled. ❤️",
        realizedPnl >= 0 
          ? `Closed out ${closingTrade.strategyName} for a clean realized profit of $${realizedPnl}!`
          : `Handled close of ${closingTrade.strategyName} with a loss of $${Math.abs(realizedPnl)}. Move on to the next opportunity.`,
        realizedPnl >= 0 ? "celebrate" : "motivation"
      );
      setClosingTrade(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShiftClockOut = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const realizedTotal = runningTrades.reduce((sum, t) => sum + (t.pnlRealized || 0), 0);
      // Calculate session duration (minutes) from clockIn to now
      const clockInTime = new Date(activeShift.clockIn);
      const clockOutTime = new Date();
      const sessionDurationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);

      // Call premium Claude-3 AI Backend endpoint to generate dynamic humanized paragraph
      const res = await fetch("/api/ai/shift-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: activeShift.id,
          tradesCount: runningTrades.length,
          realizedPnl: realizedTotal,
          postDiscipline,
          emotionsFelt,
          lessonsLearned,
          preNotes: activeShift.preNotes
        })
      });
      const data = await res.json();
      const summary = data.summary || "Shift ended successfully.";

      // Batch-save all closed running trades to the main Trade Log (trades table)
      const closedTrades = runningTrades.filter((t) => t.status === "closed");
      for (const rt of closedTrades) {
        try {
          await saveTrade(user.id, {
            date: rt.createdAt ? new Date(rt.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            instrument: rt.strategyName || "Manual Setup",
            direction: "",
            setup: rt.strategyName || "Manual Setup",
            session: "Live Session",
            entry: rt.entryPrice,
            sl: rt.slPrice,
            tp: rt.tpPrice,
            result: rt.pnlRealized,
            pnl: rt.pnlRealized,
            notes: rt.rulesFollowed.length > 0 ? `Rules: ${rt.rulesFollowed.join(", ")}` : "",
            reviewed: false,
          });
        } catch (saveErr) {
          console.error("Failed to save trade from running_trades:", saveErr);
        }
      }

      await clockOut(user.id, activeShift.id, {
        postDiscipline,
        emotionsFelt,
        lessonsLearned,
        behavioralSummary: summary,
        sessionDurationMinutes,
      });

      showCelebrate("Shift Complete! ⏱️", `Outstanding check-out. AI evaluation saved!`, "success");
      onStateChange();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const [actionLoading, setActionLoading] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* HUD Bar */}
      <Card className="p-5 border-l-4 border-l-[#F0B429] bg-[#111124]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D084] animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-[#00D084]">AI Active Shield Monitoring</span>
            </div>
            <h2 className="text-lg font-black mt-1 tracking-tight">Live Shift Dashboard</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Logged-In as {user?.email?.split('@')[0] || "Trader"} · Limits: Max loss ${activeShift.maxDrawdownLimit} / Target profit ${activeShift.targetProfit}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0D0D1A] border border-[#1E1E38] text-[10px] font-mono text-[#A0A0C0] uppercase tracking-wide">
                <Clock size={11} className="text-[#F0B429]" />
                Session Duration: {Math.round((new Date().getTime() - new Date(activeShift.clockIn).getTime()) / 60000)} min
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="gold-gradient px-4 py-2.5 rounded-xl text-xs font-black text-[#080810]"
          >
            + Register Running Trade
          </button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        
        {/* Active Trade Feeds & Register */}
        <div className="space-y-6">
          
          {/* New Running Trade Input Form */}
          {isAdding && (
            <Card className="p-6 border border-[#F0B429]/40 bg-[#0E0E1F]/90 space-y-5 animate-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between border-b border-[#1E1E38] pb-3">
                <span className="text-sm font-black text-white flex items-center gap-2">
                  <Activity size={16} className="text-[#F0B429]" />
                  Enter Running Trade Telemetry
                </span>
                <button onClick={() => setIsAdding(false)} className="text-xs text-zinc-500 hover:text-white">Cancel ×</button>
              </div>

              <div className="space-y-4">
                {/* Strategy Picker */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1.5">Select Playbook Strategy</label>
                  <select 
                    value={strategyId}
                    onChange={e => handleStrategyChange(e.target.value)}
                    className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] font-bold"
                  >
                    <option value="">No Strategy (Manual Trade)</option>
                    {playbook.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Strategy Checklist Overlay */}
                {rules.length > 0 && (
                  <div className="p-4 bg-[#14142B] border border-[#1E1E38] rounded-xl space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#F0B429]">Playbook Rule Verification Checklist</p>
                    <div className="space-y-1.5 pt-1">
                      {rules.map((rule, idx) => (
                        <label key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={rulesChecked[idx]}
                            onChange={e => {
                              const updated = [...rulesChecked];
                              updated[idx] = e.target.checked;
                              setRuleChecked(updated);
                            }}
                            className="mt-0.5 rounded border-[#1E1E38] bg-[#0D0D1A] accent-[#F0B429]"
                          />
                          <span>{rule}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prices & Sizing */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1">Entry Price</label>
                    <input 
                      type="number" value={entry} onChange={e => setEntry(Number(e.target.value))}
                      className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1">Lot Size / Position Volume</label>
                    <input 
                      type="number" value={lotSize} onChange={e => setLotSize(Number(e.target.value))}
                      className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1">Stop Loss (SL) Target</label>
                    <input 
                      type="number" value={sl} onChange={e => setSl(Number(e.target.value))}
                      className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1">Take Profit (TP) Target</label>
                    <input 
                      type="number" value={tp} onChange={e => setTp(Number(e.target.value))}
                      className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1">Planned Risk Amount ($)</label>
                    <input 
                      type="number" value={riskAmount} onChange={e => setRiskAmount(Number(e.target.value))}
                      className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1">Target Profit Amount ($)</label>
                    <input 
                      type="number" value={targetProfit} onChange={e => setTargetProfit(Number(e.target.value))}
                      className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                  </div>
                </div>

                {isCaution && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-[#FF4565]">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>CAUTION: Your planned trade risk (${riskAmount}) exceeds your daily shift loss limit (${activeShift.maxDrawdownLimit})! Standardize parameters to protect your account.</span>
                  </div>
                )}

                <button 
                  onClick={handleCreateRunningTrade}
                  className="w-full gold-gradient py-3 rounded-xl text-xs font-black text-black flex items-center justify-center gap-1.5"
                >
                  <Play size={13} /> Initialize Active Telemetry
                </button>
              </div>
            </Card>
          )}

          {/* List of active running trades */}
          <Card className="p-5">
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 text-white">
              <Clock size={16} className="text-[#00D084]" /> Active Trades Telemetry
            </h3>

            {runningTrades.filter(t => t.status === "running").length === 0 ? (
              <p className="text-center py-10 text-xs text-zinc-500 border border-dashed border-[#24243C] rounded-xl">No active trades currently running on active shift. Click "Register Running Trade" to initiate.</p>
            ) : (
              <div className="space-y-3.5">
                {runningTrades.filter(t => t.status === "running").map(t => (
                  <div key={t.id} className="p-4 bg-[#0A0A16] rounded-xl border border-[#1E1E38] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00D084] animate-pulse" />
                        <span className="text-sm font-black text-white">{t.strategyName}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">Entry: ${t.entryPrice} · SL: ${t.slPrice} · TP: ${t.tpPrice} · Lot: {t.lotSize}</p>
                      {t.rulesFollowed.length > 0 && (
                        <p className="text-[10px] text-[#F0B429] font-semibold mt-1">Verified: {t.rulesFollowed.length} rules followed</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Max Risk</p>
                        <p className="text-xs font-black text-[#FF4565]">${t.riskAmount}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setClosingTrade(t);
                          setExitPrice(t.entryPrice);
                        }}
                        className="bg-[#FF4565] hover:bg-red-600 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors"
                      >
                        Close Position
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Realized trades logged this shift */}
          <Card className="p-5">
            <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 text-white">
              <Check size={16} className="text-[#00D084]" /> Realized Trades (This Shift)
            </h3>

            {runningTrades.filter(t => t.status === "closed").length === 0 ? (
              <p className="text-center py-8 text-xs text-zinc-500">No closed trades recorded yet during this shift.</p>
            ) : (
              <div className="space-y-2">
                {runningTrades.filter(t => t.status === "closed").map(t => (
                  <div key={t.id} className="p-3 bg-[#111124]/40 border border-[#1E1E38] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{t.strategyName}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Entry: ${t.entryPrice} · Exit: ${t.exitPrice}</p>
                    </div>
                    <span className={`font-mono2 font-black ${t.pnlRealized! >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}`}>
                      {t.pnlRealized! >= 0 ? `+$${t.pnlRealized}` : `-$${Math.abs(t.pnlRealized!)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Post-Session Shift Evaluation / Clock-out */}
        <div className="space-y-6">
          
          <Card className="p-6 space-y-5 border border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                <LogOut size={20} />
              </div>
              <div>
                <h3 className="text-base font-black">Close Session Shift</h3>
                <p className="text-xs text-[#5A5A80]">Log your final discipline and clear your terminal.</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-[#1E1E38] pt-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#A0A0C0] font-bold">End-of-Session Discipline</span>
                  <span className="text-white font-black">{postDiscipline}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" value={postDiscipline}
                  onChange={e => setPostDiscipline(Number(e.target.value))}
                  className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-red-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2">Emotions Experienced</label>
                <input 
                  value={emotionsFelt}
                  onChange={e => setEmotionsFelt(e.target.value)}
                  placeholder="e.g. FOMO, Calm, Anxious, Revenge"
                  className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-2">Primary Shift Lesson Learned</label>
                <textarea
                  value={lessonsLearned}
                  onChange={e => setLessonsLearned(e.target.value)}
                  placeholder="What is the one golden takeaway from today's trades?"
                  className="w-full h-24 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 resize-none font-medium"
                />
              </div>

              <button 
                onClick={handleShiftClockOut}
                disabled={actionLoading}
                className="w-full bg-red-500 hover:bg-red-600 py-3 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                {actionLoading ? "Generating AI Summary..." : "Close & Summarize Shift"}
              </button>
            </div>
          </Card>

        </div>

      </div>

      {/* Position Closure Evaluation overlay modal */}
      {closingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-[#0D0D1A] border border-[#24243C] p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <Trophy size={18} className="text-[#F0B429]" />
              Position Close Evaluation
            </h3>
            <p className="text-xs text-[#5A5A80] mb-6">Log the realized outputs for {closingTrade.strategyName} to sync stats.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1.5">Exit Price reached</label>
                <input 
                  type="number" value={exitPrice} onChange={e => setExitPrice(Number(e.target.value))}
                  className="w-full bg-[#111120] border border-[#1E1E38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1.5">Realized Profit / Loss ($)</label>
                <input 
                  type="number" value={realizedPnl} onChange={e => setRealizedPnl(Number(e.target.value))}
                  className="w-full bg-[#111120] border border-[#1E1E38] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] font-bold"
                  placeholder="e.g. 500 or -250"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  onClick={() => setClosingTrade(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#1E1E38] text-xs font-black text-[#A0A0C0]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCloseRunningTrade}
                  className="flex-[2] gold-gradient py-2.5 rounded-xl text-xs font-black text-[#080810]"
                >
                  Save Realized Position
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* DETAILED DAILY SHIFT OVERLAY SCREEN (Claude-AI Infused) */}
      {selectedDayShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <Card className="w-full max-w-2xl bg-[#0F0F1E] border border-[#24243C] p-6 sm:p-8 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-center justify-between border-b border-[#1E1E38] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0B429]/10 flex items-center justify-center text-[#F0B429]">
                  <Brain size={20} className="animate-pulse" />
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
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Premium Claude Paragraph summary */}
              <div className="p-5 rounded-2xl bg-[#14142B] border border-[#24243C] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#F0B429]/5 to-transparent pointer-events-none" />
                <p className="text-[10px] font-black uppercase tracking-wider text-[#F0B429] mb-1.5 flex items-center gap-1">
                  <Sparkles size={11} className="animate-spin-slow" /> CLAUDE CO-PILOT ADVICE
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 italic">
                  {selectedDayShift.behavioralSummary || "No summary recorded."}
                </p>
              </div>

              {/* Shift metrics block */}
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
              </div>

              {/* Shift Trade logs */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Position logs recorded this day</h4>
                {dayTrades.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No running trade logs tracked for this shift.</p>
                ) : (
                  <div className="space-y-2">
                    {dayTrades.map(t => (
                      <div key={t.id} className="p-3 bg-[#0D0D1A] rounded-xl border border-[#1E1E38] flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{t.strategyName}</p>
                          <p className="text-[10px] text-zinc-500">Entry: ${t.entryPrice} · Exit: ${t.exitPrice || "—"}</p>
                        </div>
                        <span className={`font-mono2 font-black ${t.pnlRealized! >= 0 ? "text-[#00D084]" : "text-[#FF4565]"}`}>
                          {t.pnlRealized! >= 0 ? `+$${t.pnlRealized}` : `-$${Math.abs(t.pnlRealized!)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Claude dynamic recommendation logic */}
              <div className="p-4 bg-orange-400/5 border border-orange-400/20 rounded-xl">
                <h5 className="text-[10px] font-black uppercase text-orange-400 tracking-wider mb-1 flex items-center gap-1">
                  <Smile size={12} /> NEXT DAY FOCUS ACTION
                </h5>
                <p className="text-xs text-zinc-300">
                  {selectedDayShift.postDiscipline! < 6 
                    ? "Based on your cognitive logs today, prioritize sleep and cut your trade size by 50% tomorrow. Do not attempt to recover losses."
                    : "Excellent structure today. Maintain consistent size and restrict yourself only to your verified playbook setups."}
                </p>
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

      {/* RENDER SHIFT HISTORY SECTION UNDER COCKPIT */}
      <Card className="p-5">
        <h3 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2 text-white">
          <Calendar size={16} className="text-[#F0B429]" /> Your Completed Shift History Ledger
        </h3>
        
        {recentShifts.length === 0 ? (
          <p className="text-center py-10 text-xs text-zinc-500">No completed shifts recorded yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentShifts.map(shift => (
              <div key={shift.id} className="p-4 bg-[#0D0D1A] rounded-xl border border-[#1E1E38] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] mb-2 border-b border-[#1E1E38]/60 pb-1.5">
                    <span className="text-zinc-400 font-bold flex items-center gap-1">
                      <Clock size={11} /> {new Date(shift.clockIn).toLocaleDateString()}
                    </span>
                    <span className="text-[#00D084] font-black">Discipline: {shift.postDiscipline}/10</span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-3 italic">
                    {shift.behavioralSummary}
                  </p>
                </div>

                <button 
                  onClick={() => handleOpenDetailedDay(shift)}
                  className="w-full py-2 bg-[#1C1C30]/50 hover:bg-[#1C1C30] rounded-lg text-[11px] font-bold text-[#F0B429] flex items-center justify-center gap-1 transition"
                >
                  Read Full Day Report <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
export default ActiveShiftTerminal;
