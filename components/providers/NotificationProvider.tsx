"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, Award, Heart, CheckCircle2, ShieldAlert } from "lucide-react";
import { useSoundEffects } from "@/hooks/useSoundEffects";

type NotificationType = "success" | "achievement" | "motivation" | "celebrate";

interface AchievementNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextValue {
  showCelebrate: (title: string, message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  showCelebrate: () => {},
});

export function useNotificationCoPilot() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const { playSuccess, playReceive } = useSoundEffects();

  const showCelebrate = useCallback((title: string, message: string, type: NotificationType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, title, message, type }]);

    // Trigger positive acoustic confirmation
    if (type === "achievement" || type === "celebrate" || type === "success") {
      playSuccess();
    } else {
      playReceive();
    }
  }, [playSuccess, playReceive]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showCelebrate }}>
      {children}
      
      {/* Toast Alert stack on bottom-right corner for mobile PWAs & desktop */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onAnimationComplete={() => {
                // Auto dismiss after 6 seconds
                setTimeout(() => removeNotification(n.id), 6000);
              }}
              className="pointer-events-auto rounded-2xl border border-[#24243C] bg-[#111124] p-4 shadow-2xl flex gap-3.5 items-start relative overflow-hidden"
            >
              {/* Highlight background lines */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#F0B429]/5 to-transparent pointer-events-none" />

              {/* Leading Icon according to achievements context */}
              <div className="shrink-0">
                {n.type === "achievement" && (
                  <div className="w-10 h-10 rounded-xl bg-[#F0B429]/15 border border-[#F0B429]/25 flex items-center justify-center text-[#F0B429]">
                    <Award size={20} className="animate-bounce" />
                  </div>
                )}
                {n.type === "celebrate" && (
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                )}
                {n.type === "success" && (
                  <div className="w-10 h-10 rounded-xl bg-[#00D084]/15 border border-[#00D084]/25 flex items-center justify-center text-[#00D084]">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                {n.type === "motivation" && (
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                    <Heart size={20} />
                  </div>
                )}
              </div>

              {/* Text Area */}
              <div className="flex-1 space-y-1 min-w-0">
                <h4 className="text-sm font-black text-white truncate">{n.title}</h4>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">{n.message}</p>
              </div>

              {/* Custom micro exit button */}
              <button
                onClick={() => removeNotification(n.id)}
                className="text-zinc-500 hover:text-white text-xs font-black shrink-0 transition"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
export default NotificationProvider;
