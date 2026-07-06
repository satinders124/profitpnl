import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const INTERVAL_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

const BINANCE_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT",
  "AVAXUSDT", "LINKUSDT", "MATICUSDT", "LTCUSDT", "TRXUSDT", "DOTUSDT", "ATOMUSDT",
  "NEARUSDT", "APTUSDT", "ARBUSDT", "OPUSDT", "SUIUSDT", "TONUSDT",
];
const YAHOO_CRYPTO: Record<string, string> = {
  BTCUSDT: "BTC-USD", ETHUSDT: "ETH-USD", SOLUSDT: "SOL-USD", BNBUSDT: "BNB-USD",
  XRPUSDT: "XRP-USD", ADAUSDT: "ADA-USD", DOGEUSDT: "DOGE-USD", AVAXUSDT: "AVAX-USD",
  LINKUSDT: "LINK-USD", MATICUSDT: "MATIC-USD", LTCUSDT: "LTC-USD", TRXUSDT: "TRX-USD",
  DOTUSDT: "DOT-USD", ATOMUSDT: "ATOM-USD", NEARUSDT: "NEAR-USD", APTUSDT: "APT-USD",
  ARBUSDT: "ARB-USD", OPUSDT: "OP-USD", SUIUSDT: "SUI-USD", TONUSDT: "TON-USD",
};
const COINBASE_MAP: Record<string, string> = {
  BTCUSDT: "BTC-USD", ETHUSDT: "ETH-USD", SOLUSDT: "SOL-USD", XRPUSDT: "XRP-USD", ADAUSDT: "ADA-USD",
};
const YAHOO_INTERVALS: Record<string, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "1h", "1d": "1d",
};
const COINBASE_GRANULARITY: Record<string, number> = {
  "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 21600, "1d": 86400,
};

type Candle = {
  time: number; // unix seconds, UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

function parseMs(v: string | null) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function intervalSeconds(tf: string) {
  return INTERVAL_SECONDS[tf] || 300;
}

function aggregateCandles(candles: Candle[], targetSeconds: number): Candle[] {
  const buckets = new Map<number, Candle[]>();
  for (const c of candles) {
    const bucket = Math.floor(c.time / targetSeconds) * targetSeconds;
    const rows = buckets.get(bucket) || [];
    rows.push(c);
    buckets.set(bucket, rows);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, rows]) => {
      const sorted = rows.sort((a, b) => a.time - b.time);
      return {
        time,
        open: sorted[0].open,
        high: Math.max(...sorted.map((c) => c.high)),
        low: Math.min(...sorted.map((c) => c.low)),
        close: sorted[sorted.length - 1].close,
        volume: sorted.reduce((s, c) => s + (c.volume || 0), 0),
      };
    });
}

async function fetchYahoo(yahooSymbol: string, timeframe: string, from: number | null, to: number | null): Promise<Candle[]> {
  const interval = YAHOO_INTERVALS[timeframe] || "5m";
  const targetSeconds = intervalSeconds(timeframe);
  const endSeconds = Math.floor((to || Date.now()) / 1000);
  const startSeconds = Math.floor((from || Date.now() - targetSeconds * 300 * 1000) / 1000);
  const params = new URLSearchParams({
    period1: String(startSeconds),
    period2: String(endSeconds),
    interval,
    includePrePost: "true",
  });
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?${params.toString()}`, {
    headers: { "User-Agent": "Mozilla/5.0 ProfitPnL" },
    next: { revalidate: 60 * 5 },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps = result?.timestamp as number[] | undefined;
  const quote = result?.indicators?.quote?.[0];
  if (!timestamps?.length || !quote) throw new Error("Yahoo empty");
  const candles = timestamps.flatMap((time, i) => {
    const open = Number(quote.open?.[i]);
    const high = Number(quote.high?.[i]);
    const low = Number(quote.low?.[i]);
    const close = Number(quote.close?.[i]);
    const volume = Number(quote.volume?.[i] || 0);
    if (![open, high, low, close].every(Number.isFinite)) return [];
    return [{ time, open, high, low, close, volume } as Candle];
  });
  return timeframe === "4h" ? aggregateCandles(candles, targetSeconds) : candles;
}

async function fetchBinance(symbol: string, timeframe: string, from: number | null, to: number | null): Promise<Candle[]> {
  const params = new URLSearchParams({ symbol, interval: timeframe, limit: "1000" });
  if (from) params.set("startTime", String(from));
  if (to) params.set("endTime", String(to));
  const res = await fetch(`https://api.binance.com/api/v3/klines?${params.toString()}`, { next: { revalidate: 60 * 10 } });
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw = (await res.json()) as Array<Array<number | string>>;
  return raw
    .map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }))
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.close));
}

async function fetchCoinbase(product: string, timeframe: string, from: number | null, to: number | null): Promise<Candle[]> {
  const granularity = COINBASE_GRANULARITY[timeframe] || 300;
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - granularity * 300 * 1000);
  const params = new URLSearchParams({
    granularity: String(granularity),
    start: start.toISOString(),
    end: end.toISOString(),
  });
  const res = await fetch(`https://api.exchange.coinbase.com/products/${product}/candles?${params.toString()}`, {
    headers: { "User-Agent": "ProfitPnL" },
    next: { revalidate: 60 * 10 },
  });
  if (!res.ok) throw new Error(`Coinbase ${res.status}`);
  const raw = (await res.json()) as Array<[number, number, number, number, number, number]>;
  return raw
    .map((row) => ({ time: Number(row[0]), low: Number(row[1]), high: Number(row[2]), open: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }))
    .sort((a, b) => a.time - b.time)
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.close));
}

function generateDemoCandles(symbol: string, timeframe: string, count = 240): Candle[] {
  const step = intervalSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000 / step) * step;
  let price = symbol.startsWith("BTC") ? 65000 : symbol.startsWith("XAU") ? 2300 : symbol.startsWith("ETH") ? 3500 : 1.1;
  let seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const dp = price < 10 ? 5 : 2;
  return Array.from({ length: count }, (_, i) => {
    const time = now - (count - i) * step;
    const drift = (rand() - 0.48) * price * 0.006;
    const open = price;
    const close = Math.max(0.0001, open + drift);
    const high = Math.max(open, close) + rand() * price * 0.003;
    const low = Math.min(open, close) - rand() * price * 0.003;
    price = close;
    return {
      time,
      open: +open.toFixed(dp),
      high: +high.toFixed(dp),
      low: +low.toFixed(dp),
      close: +close.toFixed(dp),
      volume: Math.round(1000 + rand() * 5000),
    };
  });
}

/**
 * Resolve a trade instrument to the best available data sources.
 * Crypto (e.g. BTCUSDT, ETH-USD) → Binance + Yahoo + Coinbase.
 * Forex / metals (e.g. EURUSD, XAUUSD) → Yahoo `SYM=X`.
 */
function resolveSources(symbol: string) {
  const s = symbol.toUpperCase().replace("/", "");
  const cryptoBases = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", "MATIC", "LTC", "TRX", "DOT", "ATOM", "NEAR", "APT", "ARB", "OP", "SUI", "TON"];
  const isCrypto = /USDT$/.test(s) || /USDC$/.test(s) || cryptoBases.some((b) => s === `${b}USD` || s === `${b}BTC` || s === `${b}ETH`);
  if (isCrypto) {
    const base = s.replace(/(USDT|USDC|USD|BTC|ETH)$/, "");
    return {
      isCrypto: true,
      yahoo: YAHOO_CRYPTO[s] || (cryptoBases.includes(base) ? `${base}-USD` : undefined),
      coinbase: COINBASE_MAP[s],
      binance: /USDT$/.test(s) || /USDC$/.test(s) ? s : undefined,
    };
  }
  // Spot metals sometimes 404 on Yahoo's chart API; use the futures tickers.
  if (s === "XAUUSD") return { isCrypto: false, yahoo: "GC=F", coinbase: undefined, binance: undefined };
  if (s === "XAGUSD") return { isCrypto: false, yahoo: "SI=F", coinbase: undefined, binance: undefined };
  return { isCrypto: false, yahoo: `${s}=X`, coinbase: undefined, binance: undefined };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase().replace("/", "");
    const timeframe = searchParams.get("timeframe") || "1h";
    const from = parseMs(searchParams.get("from"));
    const to = parseMs(searchParams.get("to"));

    if (!TIMEFRAMES.includes(timeframe)) {
      return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });
    }

    const src = resolveSources(symbol);
    const attempts: Array<() => Promise<Candle[]>> = [];
    if (src.binance) attempts.push(() => fetchBinance(src.binance!, timeframe, from, to));
    if (src.yahoo) attempts.push(() => fetchYahoo(src.yahoo!, timeframe, from, to));
    if (src.coinbase) attempts.push(() => fetchCoinbase(src.coinbase!, timeframe, from, to));

    const errors: string[] = [];
    for (const attempt of attempts) {
      try {
        const candles = await attempt();
        if (candles.length) {
          return NextResponse.json({ symbol, timeframe, provider: "live", candles });
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    const candles = generateDemoCandles(symbol, timeframe);
    return NextResponse.json({
      symbol,
      timeframe,
      provider: "demo",
      candles,
      warning: `Live market data unavailable (${errors.slice(0, 2).join(" | ")}). Showing demo candles.`,
    });
  } catch (err) {
    console.error("Chart candles error:", err);
    return NextResponse.json({ error: "Could not load candles." }, { status: 500 });
  }
}
