"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type ChartOptions,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineData,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type {
  BacktestTrade,
  Candle,
  Drawing,
  DrawingType,
  IndicatorConfig,
  OpenBacktestTrade,
} from "@/lib/backtesting/types";
import { ema, rsi, sma } from "@/lib/backtesting/indicators";

const BASE_OPTIONS = {
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
    scaleMargins: { top: 0.08, bottom: 0.26 },
  },
  timeScale: {
    borderColor: "rgba(255,255,255,0.12)",
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 8,
    barSpacing: 8,
  },
};

export function TerminalChart({
  candles,
  openTrade,
  trades,
  indicators,
  drawings = [],
  activeTool = null,
  onAddDrawing,
  onClearDrawings,
}: {
  candles: Candle[];
  openTrade: OpenBacktestTrade | null;
  trades: BacktestTrade[];
  indicators?: IndicatorConfig;
  drawings?: Drawing[];
  activeTool?: DrawingType | null;
  onAddDrawing?: (d: Drawing) => void;
  onClearDrawings?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const smaRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [draft, setDraft] = useState<{ type: DrawingType; point?: { time: number; price: number } } | null>(null);
  const [, forceTick] = useState(0);

  // ---- Create chart + base series (once) ----
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, BASE_OPTIONS);
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

    // Re-render the drawing overlay on scroll/resize so coordinates stay aligned.
    const rerender = () => forceTick((t) => t + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(rerender);
    const ro = new ResizeObserver(rerender);
    ro.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(rerender);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
      smaRef.current = null;
      emaRef.current = null;
      rsiRef.current = null;
      volRef.current = null;
    };
  }, []);

  // ---- Indicator / volume series existence (toggled by config) ----
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const cfg = indicators;

    const ensure = (ref: React.MutableRefObject<ISeriesApi<"Line"> | null>, make: () => ISeriesApi<"Line">, on: boolean) => {
      if (on && !ref.current) ref.current = make();
      else if (!on && ref.current) {
        chart.removeSeries(ref.current);
        ref.current = null;
      }
    };

    ensure(smaRef, () => chart.addSeries(LineSeries, { color: "#f0b429", lineWidth: 2, priceLineVisible: false, lastValueVisible: false }), !!cfg?.sma.enabled);
    ensure(emaRef, () => chart.addSeries(LineSeries, { color: "#22d3ee", lineWidth: 2, priceLineVisible: false, lastValueVisible: false }), !!cfg?.ema.enabled);
    ensure(rsiRef, () => {
      const s = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, priceScaleId: "rsi" });
      chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.82, bottom: 0.02 } });
      return s;
    }, !!cfg?.rsi.enabled);

    if (cfg?.volume && !volRef.current) {
      volRef.current = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    } else if (!cfg?.volume && volRef.current) {
      chart.removeSeries(volRef.current);
      volRef.current = null;
    }
  }, [indicators]);

  // ---- Data (candles + indicators + volume) ----
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const data: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    series.setData(data);
    if (data.length > 0) chart.timeScale().scrollToRealTime();

    const closes = candles.map((c) => c.close);
    const setLine = (ref: ISeriesApi<"Line"> | null, values: (number | null)[]) => {
      if (!ref) return;
      const ld: LineData[] = [];
      for (let i = 0; i < candles.length; i++) {
        const v = values[i];
        if (v != null && Number.isFinite(v)) ld.push({ time: candles[i].time as UTCTimestamp, value: v });
      }
      ref.setData(ld);
    };

    if (indicators?.sma.enabled) setLine(smaRef.current, sma(closes, indicators.sma.period));
    if (indicators?.ema.enabled) setLine(emaRef.current, ema(closes, indicators.ema.period));
    if (indicators?.rsi.enabled) setLine(rsiRef.current, rsi(closes, indicators.rsi.period));

    if (volRef.current) {
      const vd: HistogramData[] = candles
        .filter((c) => c.volume != null)
        .map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume as number,
          color: c.close >= c.open ? "rgba(0,208,132,0.5)" : "rgba(255,69,101,0.5)",
        }));
      volRef.current.setData(vd);
    }
  }, [candles, indicators]);

  // ---- Open position price lines ----
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const lines = [
      openTrade ? series.createPriceLine({ price: openTrade.entryPrice, color: "#f0b429", lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "ENTRY" }) : null,
      openTrade ? series.createPriceLine({ price: openTrade.stopLoss, color: "#ff4565", lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: "STOP" }) : null,
      openTrade?.takeProfit ? series.createPriceLine({ price: openTrade.takeProfit, color: "#00d084", lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: "TARGET" }) : null,
    ].filter(Boolean) as ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>[];
    return () => {
      for (const line of lines) series.removePriceLine(line);
    };
  }, [openTrade]);

  // ---- Closed-trade markers ----
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

  // ---- Drawing overlay helpers ----
  const priceToY = (price: number) => seriesRef.current?.priceToCoordinate(price) ?? null;
  const timeToX = (time: number) => chartRef.current?.timeScale().timeToCoordinate(time as UTCTimestamp) ?? null;
  const yToPrice = (y: number) => seriesRef.current?.coordinateToPrice(y) ?? null;
  const xToTime = (x: number): number | null => {
    const t = chartRef.current?.timeScale().coordinateToTime(x);
    if (t == null) return null;
    if (typeof t === "number") {
      // snap to nearest candle
      let best: number | null = null;
      let bestDist = Infinity;
      for (const c of candles) {
        const d = Math.abs(c.time - t);
        if (d < bestDist) {
          bestDist = d;
          best = c.time;
        }
      }
      return best;
    }
    return null;
  };

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!activeTool || !onAddDrawing) return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const price = yToPrice(y);
    const time = xToTime(x);
    if (price == null) return;

    if (activeTool === "level") {
      onAddDrawing({ id: crypto.randomUUID(), type: "level", color: "#38bdf8", price });
      return;
    }
    // trendline / rectangle need two clicks
    const pt = time != null ? { time, price } : { time: candles[0]?.time ?? 0, price };
    if (!draft) {
      setDraft({ type: activeTool, point: pt });
    } else {
      onAddDrawing({ id: crypto.randomUUID(), type: activeTool, color: "#38bdf8", points: [draft.point!, pt] });
      setDraft(null);
    }
  }

  const allDrawings = draft ? [...drawings, { id: "draft", type: draft.type, color: "#38bdf8", points: draft.point ? [draft.point, draft.point] : undefined, price: draft.point?.price } as Drawing] : drawings;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <svg
        ref={overlayRef}
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: activeTool ? "auto" : "none", cursor: activeTool ? "crosshair" : "default" }}
        onPointerDown={handlePointerDown}
      >
        {allDrawings.map((d) => {
          if (d.type === "level" && d.price != null) {
            const y = priceToY(d.price);
            if (y == null) return null;
            return <line key={d.id} x1={0} x2="100%" y1={y} y2={y} stroke={d.color} strokeWidth={1.5} strokeDasharray="4 3" />;
          }
          if ((d.type === "trendline" || d.type === "rectangle") && d.points && d.points.length === 2) {
            const p1x = timeToX(d.points[0].time);
            const p1y = priceToY(d.points[0].price);
            const p2x = timeToX(d.points[1].time);
            const p2y = priceToY(d.points[1].price);
            if (p1x == null || p1y == null || p2x == null || p2y == null) return null;
            if (d.type === "trendline") {
              return <line key={d.id} x1={p1x} y1={p1y} x2={p2x} y2={p2y} stroke={d.color} strokeWidth={1.5} />;
            }
            return (
              <rect
                key={d.id}
                x={Math.min(p1x, p2x)}
                y={Math.min(p1y, p2y)}
                width={Math.abs(p2x - p1x)}
                height={Math.abs(p2y - p1y)}
                fill={`${d.color}22`}
                stroke={d.color}
                strokeWidth={1.5}
              />
            );
          }
          return null;
        })}
      </svg>
      {activeTool && (
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            onClearDrawings?.();
          }}
          className="absolute right-2 top-2 z-10 rounded-md border border-[#1E1E38] bg-[#0D0D1A] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#F0B429]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
