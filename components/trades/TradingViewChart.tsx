"use client";

import React, { useEffect, useRef, memo } from "react";

interface TradingViewChartProps {
  symbol: string;
  theme?: "light" | "dark";
  interval?: string;
  timezone?: string;
}

function TradingViewChartComponent({
  symbol,
  theme = "dark",
  interval = "D",
  timezone = "Etc/UTC",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean symbol to ensure it is in a format TradingView understands.
  // Standard formatting e.g. "EURUSD" -> "FX_IDC:EURUSD", "BTCUSD" -> "BINANCE:BTCUSDT" or generic "COINBASE:BTCUSD"
  const cleanSymbol = (sym: string): string => {
    const s = sym.trim().toUpperCase().replace(/[^A-Z0-9/:-]/g, "");
    if (!s) return "NASDAQ:AAPL";

    // If it already has an exchange prefix, return as-is
    if (s.includes(":")) return s;

    // Common asset classifications
    const forexPairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"];
    const basePair = s.replace("/", "");

    // XAUUSD mapping for gold futures or spot
    if (basePair === "XAUUSD" || basePair === "GOLD") {
      return "FOREXCOM:XAUUSD";
    }

    if (forexPairs.includes(basePair)) {
      return `FX_IDC:${basePair}`;
    }

    if (basePair.endsWith("USD") && basePair.length > 5) {
      // Treat as crypto default
      return `COINBASE:${basePair}`;
    }

    if (basePair.endsWith("USDT")) {
      return `BINANCE:${basePair}`;
    }

    // Default fallback to index or popular asset
    return basePair;
  };

  const tvSymbol = cleanSymbol(symbol);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous scripts/widgets inside container
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: interval,
      timezone: timezone,
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol, theme, interval, timezone]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: "450px", width: "100%" }}
    />
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);
