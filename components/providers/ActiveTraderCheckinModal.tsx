"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveShift, clockIn, TraderShift } from "@/lib/shifts-db";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Clock, HelpCircle, Activity, Info } from "lucide-react";
import { useNotificationCoPilot } from "@/components/providers/NotificationProvider";

export function ActiveTraderCheckinModal() {
  const { user } = useAuth();
  const { showCelebrate } = useNotificationCoPilot();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pre-session parameters
  const [sleep, setSleep] = useState(5);
  const [stress, setStress] = useState(5);
  const [discipline, setDiscipline] = useState(5);
  const [targetProfit, setTargetProfit] = useState(500);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState(250);
  const [preNotes, setPreNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function checkActiveSession() {
      if (!user) return;
      try {
        const active = await getActiveShift(user.id);
        if (!active) {
          const dismissedToday = localStorage.getItem(`dismissed_checkin_${new Date().toDateString()}`);
          if (!dismissedToday) {
            setIsOpen(true);
          }
        }
      } catch (e) {
        console.error("Check active shift error:", e);
      } finally {
        setLoading(false);
      }
    }
    checkActiveSession();
  }, [user]);

  const handleClockIn = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await clockIn(user.id, {
        sleepQuality: sleep,
        stressLevel: stress,
        disciplineLevel: discipline,
        preNotes,
        targetProfit: Number(targetProfit) || 0,
        maxDrawdownLimit: Number(maxDrawdownLimit) || 0
      });
      showCelebrate(
        "Shift Active! ⏱️",
        "Your AI Risk-Guard has loaded. Trade responsibly, protect your targets.",
        "success"
      );
      setIsOpen(false);
      // Fast refresh layout
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const dismissToday = () => {
    localStorage.setItem(`dismissed_checkin_${new Date().toDateString()}`, "true");
    setIsOpen(false);
  };

  if (loading || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="absolute inset-0" onClick={dismissToday} />
        
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 280 }}
          className="relative w-full max-w-lg bg-[#0F0F1E] border border-[#24243C] rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {/* Glowing backlights */}
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#F0B429]/10 blur-2xl pointer-events-none" />

          {/* Heading */}
          <div className="flex items-center gap-3.5 border-b border-[#1E1E38] pb-4 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#F0B429]/10 border border-[#F0B429]/25 flex items-center justify-center text-[#F0B429]">
              <Brain size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">AI Risk-Guard Check-In</h3>
              <p className="text-xs text-[#8080A0]">Lock in your daily targets before session start.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Target Profit & Max Drawdown Row — fully aligned on desktop and mobile */}
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

            {/* Sliders Container */}
            <div className="space-y-4 pt-3 border-t border-[#1E1E38]">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A0A0C0] font-bold">Sleep Quality</span>
                  <span className="text-[#F0B429] font-black">{sleep}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" value={sleep}
                  onChange={e => setSleep(Number(e.target.value))}
                  className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A0A0C0] font-bold">Mental Stress & Pressure</span>
                  <span className="text-[#F0B429] font-black">{stress}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" value={stress}
                  onChange={e => setStress(Number(e.target.value))}
                  className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#A0A0C0] font-bold">Emotional Discipline</span>
                  <span className="text-[#F0B429] font-black">{discipline}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" value={discipline}
                  onChange={e => setDiscipline(Number(e.target.value))}
                  className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#5A5A80] mb-1.5">Pre-Shift Focus Notes</label>
              <textarea
                value={preNotes}
                onChange={e => setPreNotes(e.target.value)}
                placeholder="e.g. 'Trade only London Open, maximum 1 entry'"
                className="w-full h-16 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl p-3 text-xs text-white outline-none focus:border-[#F0B429] resize-none font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-[#1E1E38] pt-4">
              <button
                onClick={dismissToday}
                className="flex-1 py-2.5 rounded-xl border border-[#1E1E38] text-xs font-black text-[#A0A0C0] hover:bg-[#1E1E38]/30 transition"
              >
                Skip
              </button>
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="flex-[2] gold-gradient py-2.5 rounded-xl text-[#080810] font-black text-xs flex items-center justify-center gap-2 transition hover:scale-[1.01]"
              >
                <Clock size={15} /> Clock-In Shift
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
export default ActiveTraderCheckinModal;
