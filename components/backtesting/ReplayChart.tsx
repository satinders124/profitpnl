"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, OpenBacktestTrade } from "@/lib/backtesting/types";

export function ReplayChart({ candles, openTrade }: { candles: Candle[]; openTrade: OpenBacktestTrade | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "#070712" },
        textColor: "#A0A0C0",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00D084",
      downColor: "#FF4565",
      wickUpColor: "#00D084",
      wickDownColor: "#FF4565",
      borderVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
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

    if (data.length > 0) {
      chart.timeScale().scrollToPosition(0, false);
    }
  }, [candles]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const lines = [
      openTrade
        ? series.createPriceLine({
            price: openTrade.entryPrice,
            color: "#F0B429",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "Entry",
          })
        : null,
      openTrade
        ? series.createPriceLine({
            price: openTrade.stopLoss,
            color: "#FF4565",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "SL",
          })
        : null,
      openTrade?.takeProfit
        ? series.createPriceLine({
            price: openTrade.takeProfit,
            color: "#00D084",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP",
          })
        : null,
    ].filter(Boolean) as ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[];

    return () => {
      for (const line of lines) series.removePriceLine(line);
    };
  }, [openTrade]);

  return <div ref={containerRef} className="h-full w-full" />;
}
