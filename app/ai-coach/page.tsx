"use client";

import { useEffect, useState } from "react";
import { AiCoachChat } from "@/components/ai/AiCoachChat";
import { useMode } from "@/components/providers/ModeProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getModels,
  getTrades,
  toTrade,
  type BacktestModel,
  type BacktestJournalTrade,
} from "@/lib/backtesting/journal";
import { Trade } from "@/types/trade";

export default function AiCoachPage() {
  const { mode } = useMode();
  const { user } = useAuth();
  const [backtestTrades, setBacktestTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (mode !== "backtest" || !user) {
      setBacktestTrades([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const models: BacktestModel[] = await getModels();
        const all = await Promise.all(models.map((m) => getTrades(m.id)));
        const flat = all.flat() as BacktestJournalTrade[];
        if (!active) return;
        setBacktestTrades(
          flat
            .map((t) => {
              const model = models.find((m) => m.id === t.session_id);
              return model ? toTrade(t, model) : null;
            })
            .filter((x): x is Trade => x !== null)
        );
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, user]);

  return (
    <AiCoachChat
      title="AI Coach"
      backtest={mode === "backtest"}
      backtestTrades={backtestTrades}
    />
  );
}
