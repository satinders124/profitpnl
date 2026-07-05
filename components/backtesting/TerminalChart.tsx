"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { BacktestTrade, Candle, OpenBacktestTrade } from "@/lib/backtesting/types";

export function TerminalChart({
  candles,
  openTrade,
  trades,
}: {
  candles: Candle[];
  openTrade: OpenBacktestTrade | null;
  trades: BacktestTrade[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "#05050b" },
        textColor: "#a0a0c0",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.045)" },
        horzLines: { color: "rgba(255,255,255,0.045)" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)",
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00d084",
      downColor: "#ff4565",
      wickUpColor: "#00d084",
      wickDownColor: "#ff4565",
      borderVisible: false,
      priceLineVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, [], { zOrder: "top" });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const data: CandlestickData[] = candles.map((candle) => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    series.setData(data);
    if (data.length > 0) chart.timeScale().scrollToRealTime();
  }, [candles]);

  useEffect(() => {
    const markersApi = markersRef.current;
    if (!markersApi) return;

    const markers: SeriesMarker<Time>[] = trades.flatMap((trade) => [
      {
        time: trade.entryTime as UTCTimestamp,
        position: trade.side === "long" ? "belowBar" : "aboveBar",
        color: trade.side === "long" ? "#00d084" : "#ff4565",
        shape: trade.side === "long" ? "arrowUp" : "arrowDown",
        text: `${trade.side.toUpperCase()} ${trade.rMultiple >= 0 ? "+" : ""}${trade.rMultiple.toFixed(2)}R`,
        size: 1.2,
      },
      {
        time: trade.exitTime as UTCTimestamp,
        position: "atPriceMiddle",
        price: trade.exitPrice,
        color: trade.pnl >= 0 ? "#00d084" : "#ff4565",
        shape: "circle",
        text: trade.exitReason,
        size: 0.9,
      },
    ]);

    markersApi.setMarkers(markers);
  }, [trades]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const lines = [
      openTrade
        ? series.createPriceLine({
            price: openTrade.entryPrice,
            color: "#f0b429",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "ENTRY",
          })
        : null,
      openTrade
        ? series.createPriceLine({
            price: openTrade.stopLoss,
            color: "#ff4565",
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: "STOP",
          })
        : null,
      openTrade?.takeProfit
        ? series.createPriceLine({
            price: openTrade.takeProfit,
            color: "#00d084",
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: "TARGET",
          })
        : null,
    ].filter(Boolean) as ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[];

    return () => {
      for (const line of lines) series.removePriceLine(line);
    };
  }, [openTrade]);

  return <div ref={containerRef} className="h-full w-full" />;
}
