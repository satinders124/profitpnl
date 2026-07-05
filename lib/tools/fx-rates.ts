const FX_ENDPOINT = "https://open.er-api.com/v6/latest";
const CACHE_TTL_MS = 30 * 60 * 1000;

type RatesResponse = {
  result: string;
  base_code: string;
  rates: Record<string, number>;
};

const cache = new Map<string, { fetchedAt: number; rates: Record<string, number> }>();

async function fetchRates(base: string): Promise<Record<string, number>> {
  const cached = cache.get(base);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  const res = await fetch(`${FX_ENDPOINT}/${base}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FX rate request failed (${res.status})`);
  }

  const data = (await res.json()) as RatesResponse;
  if (data.result !== "success" || !data.rates) {
    throw new Error("FX rate provider returned an unexpected response.");
  }

  cache.set(base, { fetchedAt: Date.now(), rates: data.rates });
  return data.rates;
}

/** Returns how many units of `to` one unit of `from` buys. */
export async function getConversionRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const rates = await fetchRates(from);
  const rate = rates[to];

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No FX rate available for ${from} → ${to}.`);
  }

  return rate;
}
