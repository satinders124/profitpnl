"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type Mode = "live" | "backtest";

type ModeContextValue = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);
const STORAGE_KEY = "ppnl-mode";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("live");

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "live" || stored === "backtest") {
        setModeState(stored);
      }
    } catch {
      // ignore unavailable storage
    }
  }, []);

  const setMode = (next: Mode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore unavailable storage
    }
  };

  const toggleMode = () => setMode(mode === "live" ? "backtest" : "live");

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

/**
 * Keeps the persisted mode in sync with the route so the nav always matches the
 * section the user is actually viewing (/bt* => backtest, otherwise live).
 */
export function ModeSync() {
  const pathname = usePathname();
  const { setMode } = useMode();
  useEffect(() => {
    setMode(pathname.startsWith("/bt") ? "backtest" : "live");
  }, [pathname, setMode]);
  return null;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return ctx;
}
