"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveShift, getRecentShifts, clockIn, clockOut } from "@/lib/shifts-db";
import { getTrades } from "@/lib/db";
import { Trade } from "@/types/trade";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Clock, LogIn, ShieldAlert, Heart, Calendar } from "lucide-react";
import { useNotificationCoPilot } from "@/components/providers/NotificationProvider";

export function ActiveTraderCheckinModal() {
  const { user } = useAuth();
  const { showCelebrate } = useNotificationCoPilot();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<any | null>(null);

  // Sliders State
  const [sleep, setSleep] = useState(5);
  const [stress, setStress] = useState(5);
  const [discipline, setDiscipline] = useState(5);
  const [preNotes, setPreNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function checkActiveSession() {
      if (!user) return;
      try {
        const active = await getActiveShift(user.id);
        setActiveShift(active);

        // 🚨 AUTOMATIC GAME-CHANGER LAUNCH TRIGGER:
        // If the user has NOT clocked in for their session today, trigger the AI Risk-Guard overlay prompt instantly on dashboard!
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
        preNotes
      });
      showCelebrate(
        "Shift Clocked-In! ⏱️",
        "Your focus boundaries are active. Trade your plan, protect your size.",
        "success"
      );
      setIsOpen(false);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        {/* Backdrop clickable to close */}
        <div className="absolute inset-0" onClick={dismissToday} />
        
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 280 }}
          className="relative w-full max-w-lg bg-[#0F0F1E] border border-[#24243C] rounded-2xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
        >
          {/* Decorative glowing lines */}
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#F0B429]/10 blur-2xl pointer-events-none" />

          {/* Heading */}
          <div className="flex items-center gap-3.5 border-b border-[#1E1E38] pb-4 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#F0B429]/10 border border-[#F0B429]/25 flex items-center justify-center text-[#F0B429]">
              <Brain size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Real-Time AI Risk-Guard Check-In
              </h3>
              <p className="text-xs text-[#8080A0]">Complete your pre-session indicators to unlock your shift co-pilot.</p>
            </div>
          </div>

          {/* Sliders Container */}
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#A0A0C0] font-bold">Sleep Quality & Alertness</span>
                <span className="text-[#F0B429] font-black">{sleep}/10</span>
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
                <span className="text-[#F0B429] font-black">{stress}/10</span>
              </div>
              <input 
                type="range" min="1" max="10" value={stress}
                onChange={e => setStress(Number(e.target.value))}
                className="w-full h-1 bg-[#1E1E38] rounded-lg appearance-none cursor-pointer accent-[#F0B429]" 
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#A0A0C0] font-bold">Emotional Discipline Rating</span>
                <span className="text-[#F0B429] font-black">{discipline}/10</span>
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
                placeholder="e.g. 'Trade only A+ setups. Close chart after maximum 2 losses.'"
                className="w-full h-20 bg-[#0D0D1A] border border-[#1E1E38] rounded-xl p-3 text-xs text-white outline-none focus:border-[#F0B429] resize-none font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-[#1E1E38] pt-5">
              <button
                onClick={dismissToday}
                className="flex-1 py-3 rounded-xl border border-[#1E1E38] text-xs font-black text-[#A0A0C0] hover:bg-[#1E1E38]/30 transition"
              >
                Skip Check-In
              </button>
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="flex-[2] gold-gradient py-3 rounded-xl text-[#080810] font-black text-xs flex items-center justify-center gap-2 transition hover:scale-[1.01]"
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
