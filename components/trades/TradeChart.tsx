"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

const COLORS = {
  bg: "#070712",
  text: "#A0A0C0",
  grid: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.12)",
  up: "#00D084",
  down: "#FF4565",
  entry: "#F0B429",
  sl: "#FF4565",
  tp: "#00D084",
};

const VALID_TFS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

// Map a human timeframe (1H, 15M, 5m, 1h, D...) to one our candles API accepts.
function normalizeTimeframe(tf?: string): string {
  if (!tf) return "1h";
  const m = tf.trim().toUpperCase();
  const map: Record<string, string> = {
    "1": "1m", "1M": "1m",
    "3": "3m", "3M": "3m",
    "5": "5m", "5M": "5m",
    "15": "15m", "15M": "15m",
    "30": "30m", "30M": "30m",
    "1H": "1h", "60": "1h", "60M": "1h",
    "4H": "4h", "240": "4h", "240M": "4h",
    "1D": "1d", "D": "1d",
  };
  const out = map[m];
  return out && VALID_TFS.includes(out) ? out : "1h";
}

function normalizeSymbol(instrument?: string): string {
  const raw = (instrument || "").trim().toUpperCase().replace("/", "");
  if (!raw) return "BTCUSDT";
  return raw;
}

function toNumber(v?: number | string): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Combine date + time into ms epoch. Timezone is unknown, but this is close
// enough to center the chart on the trade's execution candle.
function tradeTimeMs(date?: string, time?: string): number | null {
  if (!date) return null;
  const t = time && time.trim() ? time.trim() : "00:00";
  const ms = new Date(`${date}T${t}`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export type TradeChartProps = {
  instrument: string;
  entry?: number | string;
  sl?: number | string;
  tp?: number | string;
  direction?: "LONG" | "SHORT" | string;
  date?: string;
  time?: string;
  timeframe?: string;
  height?: number;
  className?: string;
};

type RawCandle = { time: number; open: number; high: number; low: number; close: number };

export function TradeChart({
  instrument,
  entry,
  sl,
  tp,
  direction,
  date,
  time,
  timeframe,
  height = 360,
  className = "",
}: TradeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [meta, setMeta] = useState<{ provider?: string; warning?: string; error?: string }>({});

  // Keep latest trade values in a ref so the chart instance survives trade changes.
  const tradeRef = useRef({ instrument, entry, sl, tp, direction, date, time, timeframe });
  tradeRef.current = { instrument, entry, sl, tp, direction, date, time, timeframe };

  // 1) Create the chart + markers plugin once. Size it manually (ResizeObserver)
  //    so we never depend on autoSize timing — guarantees the canvas has real px.
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      layout: { background: { color: COLORS.bg }, textColor: COLORS.text },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      borderVisible: false,
    });

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) chart.resize(w, h);
    };
    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(container);

    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers(series, []);

    return () => {
      ro?.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersApiRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  // 2) Load candles + draw Entry/SL/TP + mark & scroll to the execution candle.
  useEffect(() => {
    let cancelled = false;
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const {
      instrument: inst,
      entry: e,
      sl: slVal,
      tp: tpVal,
      direction: dir,
      date: d,
      time: tm,
      timeframe: tf,
    } = tradeRef.current;

    const symbol = normalizeSymbol(inst);
    const tfNorm = normalizeTimeframe(tf);
    const execMs = tradeTimeMs(d, tm);

    async function run(s: ISeriesApi<"Candlestick">, c: IChartApi) {
      try {
        setStatus("loading");
        setMeta({});
        const params = new URLSearchParams({ symbol, timeframe: tfNorm });
        if (execMs) {
          // Request a window around the trade so the execution candle is present.
          params.set("from", String(execMs - 3 * 24 * 60 * 60 * 1000));
          params.set("to", String(execMs + 1 * 24 * 60 * 60 * 1000));
        }

        const res = await fetch(`/api/chart/candles?${params.toString()}`);
        if (!res.ok) throw new Error(`Chart data ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const raw: RawCandle[] = Array.isArray(json?.candles) ? json.candles : [];
        if (!raw.length) throw new Error("No candles returned");

        // lightweight-charts requires strictly ascending, unique times.
        const seen = new Set<number>();
        const data: CandlestickData[] = raw
          .filter((candle) => candle && Number.isFinite(candle.time) && Number.isFinite(candle.open) && Number.isFinite(candle.close))
          .sort((a, b) => a.time - b.time)
          .filter((candle) => {
            if (seen.has(candle.time)) return false;
            seen.add(candle.time);
            return true;
          })
          .map((candle) => ({
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));

        if (!data.length) throw new Error("No valid candles");
        s.setData(data);

        // --- Entry / SL / TP price lines (clear any from a previous trade) ---
        priceLinesRef.current.forEach((line) => s.removePriceLine(line));
        priceLinesRef.current = [];
        const eN = toNumber(e);
        const sN = toNumber(slVal);
        const tN = toNumber(tpVal);
        if (eN !== null) {
          priceLinesRef.current.push(s.createPriceLine({ price: eN, color: COLORS.entry, lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "Entry" }));
        }
        if (sN !== null) {
          priceLinesRef.current.push(s.createPriceLine({ price: sN, color: COLORS.sl, lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "SL" }));
        }
        if (tN !== null) {
          priceLinesRef.current.push(s.createPriceLine({ price: tN, color: COLORS.tp, lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: "TP" }));
        }

        // --- Marker on the execution candle + center it in the viewport ---
        if (execMs) {
          const targetSec = Math.floor(execMs / 1000);
          let idx = data.findIndex((d) => (d.time as number) >= targetSec);
          if (idx === -1) idx = data.length - 1;

          const isShort = dir === "SHORT";
          const marker: SeriesMarker<Time> = {
            time: data[idx].time,
            position: isShort ? "aboveBar" : "belowBar",
            color: isShort ? COLORS.sl : COLORS.tp,
            shape: isShort ? "arrowDown" : "arrowUp",
            text: "Trade",
          };
          markersApiRef.current?.setMarkers([marker]);

          const half = Math.max(20, Math.round(data.length / 3));
          const fromIdx = Math.max(0, idx - half);
          const toIdx = Math.min(data.length, idx + Math.round(half / 2));
          c.timeScale().setVisibleLogicalRange({ from: fromIdx, to: toIdx });
        } else {
          markersApiRef.current?.setMarkers([]);
          c.timeScale().fitContent();
        }

        if (!cancelled) {
          setStatus("ready");
          setMeta({ provider: json.provider, warning: json.warning });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMeta({ error: err instanceof Error ? err.message : "Failed to load chart" });
        }
      }
    }

    run(series, chart);
    return () => {
      cancelled = true;
    };
  }, [instrument, entry, sl, tp, direction, date, time, timeframe]);

  const badge =
    status === "loading"
      ? { text: "Loading…", cls: "bg-white/10 text-zinc-300" }
      : status === "error"
        ? { text: "Chart unavailable", cls: "bg-[#FF4565]/20 text-[#FF4565]" }
        : meta.provider === "demo"
          ? { text: "DEMO DATA · live source unreachable", cls: "bg-[#F0B429]/20 text-[#F0B429]" }
          : { text: `LIVE · ${meta.provider === "live" ? "Binance / Yahoo" : meta.provider || "market"}`, cls: "bg-[#00D084]/15 text-[#00D084]" };

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      <div className={`absolute left-2 top-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}>
        {badge.text}
      </div>
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-zinc-400">
          Couldn&apos;t load market data for {instrument}.
          {meta.error ? ` (${meta.error})` : ""}
        </div>
      )}
      {meta.warning && status === "ready" && (
        <div className="absolute bottom-2 left-2 right-2 truncate rounded-md bg-black/40 px-2 py-1 text-[10px] text-zinc-400">
          {meta.warning}
        </div>
      )}
    </div>
  );
}

export default TradeChart;
