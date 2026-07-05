import { NextResponse } from "next/server";
import { BINANCE_SYMBOLS, TIMEFRAMES, type Candle } from "@/lib/backtesting/types";

export const runtime = "nodejs";

const BINANCE_INTERVALS = new Set(TIMEFRAMES);
const COINBASE_GRANULARITY: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 21600,
  "1d": 86400,
};
const COINBASE_SYMBOLS: Record<string, string> = {
  BTCUSDT: "BTC-USD",
  ETHUSDT: "ETH-USD",
  SOLUSDT: "SOL-USD",
  XRPUSDT: "XRP-USD",
  ADAUSDT: "ADA-USD",
};

function parseDateMs(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function intervalSeconds(timeframe: string) {
  return COINBASE_GRANULARITY[timeframe] || 300;
}

async function fetchBinance(symbol: string, timeframe: string, from: number | null, to: number | null): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol,
    interval: timeframe,
    limit: "1000",
  });
  if (from) params.set("startTime", String(from));
  if (to) params.set("endTime", String(to));

  const res = await fetch(`https://api.binance.com/api/v3/klines?${params.toString()}`, {
    next: { revalidate: 60 * 10 },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Binance ${res.status}: ${detail}`);
  }

  const raw = (await res.json()) as Array<Array<number | string>>;
  return raw.map((row) => ({
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  })).filter((c) => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.close));
}

async function fetchCoinbase(symbol: string, timeframe: string, from: number | null, to: number | null): Promise<Candle[]> {
  const product = COINBASE_SYMBOLS[symbol];
  if (!product) throw new Error("No Coinbase fallback product for symbol");
  const granularity = intervalSeconds(timeframe);
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - granularity * 300 * 1000);

  // Coinbase caps public candle requests to ~300 candles. This is enough for
  // a robust MVP fallback when Binance is geo-blocked; users can upload CSV for
  // larger custom datasets.
  const params = new URLSearchParams({
    granularity: String(granularity),
    start: start.toISOString(),
    end: end.toISOString(),
  });
  const res = await fetch(`https://api.exchange.coinbase.com/products/${product}/candles?${params.toString()}`, {
    headers: { "User-Agent": "ProfitPnL Backtesting Lab" },
    next: { revalidate: 60 * 10 },
  });
  if (!res.ok) throw new Error(`Coinbase ${res.status}: ${await res.text()}`);
  const raw = (await res.json()) as Array<[number, number, number, number, number, number]>;
  return raw
    .map((row) => ({
      time: Number(row[0]),
      low: Number(row[1]),
      high: Number(row[2]),
      open: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }))
    .sort((a, b) => a.time - b.time)
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.close));
}

function generateDemoCandles(symbol: string, timeframe: string, count = 240): Candle[] {
  const step = intervalSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000 / step) * step;
  let price = symbol.startsWith("BTC") ? 65000 : symbol.startsWith("ETH") ? 3500 : 150;
  let seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, (_, index) => {
    const time = now - (count - index) * step;
    const drift = (rand() - 0.48) * price * 0.006;
    const open = price;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + rand() * price * 0.003;
    const low = Math.min(open, close) - rand() * price * 0.003;
    price = close;
    return {
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(1000 + rand() * 5000),
    };
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") || "binance";
    const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();
    const timeframe = searchParams.get("timeframe") || "5m";
    const from = parseDateMs(searchParams.get("from"));
    const to = parseDateMs(searchParams.get("to"));

    if (provider !== "binance") {
      return NextResponse.json({ error: "Only Binance/Coinbase crypto data is enabled in this MVP. Upload CSV for any other market/data source." }, { status: 400 });
    }
    if (!BINANCE_SYMBOLS.includes(symbol)) {
      return NextResponse.json({ error: "Unsupported crypto symbol." }, { status: 400 });
    }
    if (!BINANCE_INTERVALS.has(timeframe)) {
      return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });
    }

    try {
      const candles = await fetchBinance(symbol, timeframe, from, to);
      return NextResponse.json({ provider: "binance", symbol, timeframe, candles });
    } catch (binanceError) {
      console.warn("Binance unavailable, trying Coinbase fallback:", binanceError);
      try {
        const candles = await fetchCoinbase(symbol, timeframe, from, to);
        if (candles.length) {
          return NextResponse.json({
            provider: "coinbase-fallback",
            symbol,
            timeframe,
            candles,
            warning: "Binance was unavailable from this region, so Coinbase fallback data was used.",
          });
        }
      } catch (coinbaseError) {
        console.warn("Coinbase fallback unavailable, returning demo candles:", coinbaseError);
      }
    }

    return NextResponse.json({
      provider: "demo-fallback",
      symbol,
      timeframe,
      candles: generateDemoCandles(symbol, timeframe),
      warning: "Live data providers were unavailable. Deterministic demo candles were returned so the replay engine can still be tested. Upload CSV for real custom data.",
    });
  } catch (error) {
    console.error("Candles API error:", error);
    return NextResponse.json({ error: "Could not load candles." }, { status: 500 });
  }
}
