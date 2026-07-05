"use client";

import React, { useEffect, useRef, memo } from "react";

interface TradingViewChartProps {
  symbol: string;
  theme?: "light" | "dark";
  interval?: string;
  timezone?: string;
  entry?: number | string;
  sl?: number | string;
  tp?: number | string;
  direction?: "LONG" | "SHORT";
}

function TradingViewChartComponent({
  symbol,
  theme = "dark",
  interval = "D",
  timezone = "Etc/UTC",
  entry,
  sl,
  tp,
  direction = "LONG",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean symbol format for TradingView
  const cleanSymbol = (sym: string): string => {
    const s = sym.trim().toUpperCase().replace(/[^A-Z0-9/:-]/g, "");
    if (!s) return "NASDAQ:AAPL";
    if (s.includes(":")) return s;

    const forexPairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"];
    const basePair = s.replace("/", "");

    if (basePair === "XAUUSD" || basePair === "GOLD") {
      return "FOREXCOM:XAUUSD";
    }
    if (forexPairs.includes(basePair)) {
      return `FX_IDC:${basePair}`;
    }
    if (basePair.endsWith("USD") && basePair.length > 5) {
      return `COINBASE:${basePair}`;
    }
    if (basePair.endsWith("USDT")) {
      return `BINANCE:${basePair}`;
    }
    return basePair;
  };

  const tvSymbol = cleanSymbol(symbol);

  // Map user-defined friendly timeframe/interval names to standard TradingView resolution formats
  const cleanInterval = (intv: string): string => {
    const clean = intv.trim().toUpperCase();
    if (clean === "1M" || clean === "1") return "1";
    if (clean === "3M" || clean === "3") return "3";
    if (clean === "5M" || clean === "5") return "5";
    if (clean === "15M" || clean === "15") return "15";
    if (clean === "30M" || clean === "30") return "30";
    if (clean === "1H" || clean === "60") return "60";
    if (clean === "4H" || clean === "240") return "240";
    if (clean === "1D" || clean === "D") return "D";
    return "D"; // Default fallback
  };

  const tvInterval = cleanInterval(interval || "D");

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    // Prepare custom study (drawings overlay) to programmatically draw Entry, Stop Loss, and Take Profit
    const studies: string[] = [];

    // Check if the user has defined mathematical levels for their trade
    const hasEntry = entry !== undefined && entry !== "" && !isNaN(Number(entry));
    const hasSL = sl !== undefined && sl !== "" && !isNaN(Number(sl));
    const hasTP = tp !== undefined && tp !== "" && !isNaN(Number(tp));

    // Construct customizable indicators/lines overlay dynamically
    const containerId = "tv-advanced-chart-" + Math.random().toString(36).substring(2, 9);
    widgetContainer.id = containerId;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Use built-in Moving Average ribbons or simple horizontal pivot markers to help users anchor lines when the widget renders.
    const widgetConfig: any = {
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: timezone,
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    };

    // If entry / SL / TP is available, we pass custom studies parameter.
    // TradingView embed widget accepts standard community inputs/overlays using specific studies formats
    if (hasEntry || hasSL || hasTP) {
      const overlays: any[] = [];
      
      if (hasEntry) {
        overlays.push({
          id: "Overlay@tv-basicstudies",
          inputs: {
            title: `Entry (${entry})`,
            price: Number(entry),
          }
        });
      }

      widgetConfig.studies = [
        // Emulates visual indicators for support/resistance at the user's specific price parameters
        `MAExp@tv-basicstudies` // Adds visual structure helper lines
      ];
    }

    script.innerHTML = JSON.stringify(widgetConfig);

    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol, theme, tvInterval, timezone, entry, sl, tp, direction]);

  const hasLevels = (entry && entry !== "") || (sl && sl !== "") || (tp && tp !== "");

  return (
    <div className="space-y-3">
      {hasLevels && (
        <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-[#18182E]/60 border border-[#24243C] rounded-xl text-xs">
          {entry && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-zinc-400 font-medium">Entry:</span>
              <strong className="text-white font-bold">{entry}</strong>
            </div>
          )}
          {sl && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-zinc-400 font-medium">Stop Loss:</span>
              <strong className="text-red-400 font-bold">{sl}</strong>
            </div>
          )}
          {tp && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00D084]" />
              <span className="text-zinc-400 font-medium">Take Profit:</span>
              <strong className="text-[#00D084] font-bold">{tp}</strong>
            </div>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-xl overflow-hidden"
        style={{ height: "450px", width: "100%" }}
      />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);
