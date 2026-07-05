/**
 * Instrument reference data for ProfitPnL's public trading calculators.
 *
 * The calculators use:
 * - Forex/metals/crypto: pip value = pipSize × contractSize × lots
 * - Futures/CFDs: tick value = tickSize × pointValue × contracts/lots
 *
 * CFD specs vary by broker, so index/metals/crypto instruments include notes
 * and the UI lets users manually override conversion rates where needed.
 */
export type InstrumentCategory = "forex" | "metals" | "crypto" | "futures" | "indices";

export type Instrument = {
  symbol: string;
  label: string;
  category: InstrumentCategory;
  /** Smallest price increment used by the calculator: pip for FX, tick for futures. */
  pipSize: number;
  /** Units of base asset per 1.00 standard lot. For futures/indices this is normally 1. */
  contractSize: number;
  /** Currency the instrument P&L is naturally quoted/settled in. */
  quoteCurrency: string;
  /** Base leg, e.g. EUR in EURUSD. */
  baseCurrency?: string;
  /** Normal display precision for price fields/results. */
  priceDecimals: number;
  /** Value of a 1.00 point move per 1 contract/lot in quoteCurrency. Used by futures/indices. */
  pointValue?: number;
  /** Tradable quantity increment. Futures are whole contracts; most retail CFD/FX lots are 0.01. */
  quantityStep: number;
  note?: string;
};

export const INSTRUMENTS: Instrument[] = [
  // Forex majors
  { symbol: "EURUSD", label: "EUR/USD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", baseCurrency: "EUR", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "GBPUSD", label: "GBP/USD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", baseCurrency: "GBP", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "AUDUSD", label: "AUD/USD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", baseCurrency: "AUD", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "NZDUSD", label: "NZD/USD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "USD", baseCurrency: "NZD", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "USDCAD", label: "USD/CAD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "CAD", baseCurrency: "USD", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "USDCHF", label: "USD/CHF", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "CHF", baseCurrency: "USD", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "USDJPY", label: "USD/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "USD", priceDecimals: 3, quantityStep: 0.01 },

  // Forex crosses
  { symbol: "EURJPY", label: "EUR/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "EUR", priceDecimals: 3, quantityStep: 0.01 },
  { symbol: "GBPJPY", label: "GBP/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "GBP", priceDecimals: 3, quantityStep: 0.01 },
  { symbol: "EURGBP", label: "EUR/GBP", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "GBP", baseCurrency: "EUR", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "EURAUD", label: "EUR/AUD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "AUD", baseCurrency: "EUR", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "AUDJPY", label: "AUD/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "AUD", priceDecimals: 3, quantityStep: 0.01 },
  { symbol: "AUDNZD", label: "AUD/NZD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "NZD", baseCurrency: "AUD", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "GBPAUD", label: "GBP/AUD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "AUD", baseCurrency: "GBP", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "GBPCAD", label: "GBP/CAD", category: "forex", pipSize: 0.0001, contractSize: 100000, quoteCurrency: "CAD", baseCurrency: "GBP", priceDecimals: 5, quantityStep: 0.01 },
  { symbol: "CADJPY", label: "CAD/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "CAD", priceDecimals: 3, quantityStep: 0.01 },
  { symbol: "CHFJPY", label: "CHF/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "CHF", priceDecimals: 3, quantityStep: 0.01 },
  { symbol: "NZDJPY", label: "NZD/JPY", category: "forex", pipSize: 0.01, contractSize: 100000, quoteCurrency: "JPY", baseCurrency: "NZD", priceDecimals: 3, quantityStep: 0.01 },

  // Metals/crypto CFD conventions
  { symbol: "XAUUSD", label: "Gold (XAU/USD)", category: "metals", pipSize: 0.01, contractSize: 100, quoteCurrency: "USD", baseCurrency: "XAU", priceDecimals: 2, quantityStep: 0.01, note: "Common retail convention: 1 standard XAUUSD lot = 100 oz. Verify your broker's contract spec before trading." },
  { symbol: "XAGUSD", label: "Silver (XAG/USD)", category: "metals", pipSize: 0.001, contractSize: 5000, quoteCurrency: "USD", baseCurrency: "XAG", priceDecimals: 3, quantityStep: 0.01, note: "Common retail convention: 1 standard XAGUSD lot = 5,000 oz. Verify your broker's contract spec before trading." },
  { symbol: "BTCUSD", label: "Bitcoin (BTC/USD)", category: "crypto", pipSize: 1, contractSize: 1, quoteCurrency: "USD", baseCurrency: "BTC", priceDecimals: 1, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = 1 BTC. Crypto CFD contract sizes vary by broker." },
  { symbol: "ETHUSD", label: "Ethereum (ETH/USD)", category: "crypto", pipSize: 0.1, contractSize: 1, quoteCurrency: "USD", baseCurrency: "ETH", priceDecimals: 2, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = 1 ETH. Crypto CFD contract sizes vary by broker." },

  // Exchange-traded futures. These use official fixed point values.
  { symbol: "ES", label: "E-mini S&P 500 (ES)", category: "futures", pipSize: 0.25, contractSize: 1, quoteCurrency: "USD", priceDecimals: 2, pointValue: 50, quantityStep: 1, note: "CME spec: tick 0.25 = $12.50; 1 point = $50." },
  { symbol: "MES", label: "Micro E-mini S&P 500 (MES)", category: "futures", pipSize: 0.25, contractSize: 1, quoteCurrency: "USD", priceDecimals: 2, pointValue: 5, quantityStep: 1, note: "CME spec: tick 0.25 = $1.25; 1 point = $5." },
  { symbol: "NQ", label: "E-mini Nasdaq-100 (NQ)", category: "futures", pipSize: 0.25, contractSize: 1, quoteCurrency: "USD", priceDecimals: 2, pointValue: 20, quantityStep: 1, note: "CME spec: tick 0.25 = $5; 1 point = $20." },
  { symbol: "MNQ", label: "Micro E-mini Nasdaq-100 (MNQ)", category: "futures", pipSize: 0.25, contractSize: 1, quoteCurrency: "USD", priceDecimals: 2, pointValue: 2, quantityStep: 1, note: "CME spec: tick 0.25 = $0.50; 1 point = $2." },
  { symbol: "YM", label: "E-mini Dow (YM)", category: "futures", pipSize: 1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 0, pointValue: 5, quantityStep: 1, note: "CBOT spec: tick 1 = $5; 1 point = $5." },
  { symbol: "MYM", label: "Micro E-mini Dow (MYM)", category: "futures", pipSize: 1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 0, pointValue: 0.5, quantityStep: 1, note: "CBOT spec: tick 1 = $0.50; 1 point = $0.50." },
  { symbol: "RTY", label: "E-mini Russell 2000 (RTY)", category: "futures", pipSize: 0.1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 1, pointValue: 50, quantityStep: 1, note: "CME spec: tick 0.10 = $5; 1 point = $50." },
  { symbol: "GC", label: "Gold Futures (GC)", category: "futures", pipSize: 0.1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 1, pointValue: 100, quantityStep: 1, note: "COMEX spec: tick 0.10 = $10; 1 point = $100." },
  { symbol: "SI", label: "Silver Futures (SI)", category: "futures", pipSize: 0.005, contractSize: 1, quoteCurrency: "USD", priceDecimals: 3, pointValue: 5000, quantityStep: 1, note: "COMEX spec: tick 0.005 = $25; 1 point = $5,000." },
  { symbol: "CL", label: "Crude Oil Futures (CL)", category: "futures", pipSize: 0.01, contractSize: 1, quoteCurrency: "USD", priceDecimals: 2, pointValue: 1000, quantityStep: 1, note: "NYMEX spec: tick 0.01 = $10; 1 point = $1,000." },

  // Index CFDs. These are common conventions only; users should verify broker specs.
  { symbol: "US30", label: "US Wall St 30 (US30)", category: "indices", pipSize: 1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 0, pointValue: 1, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = $1/point. Index CFD specs vary by broker." },
  { symbol: "NAS100", label: "US Tech 100 (NAS100)", category: "indices", pipSize: 1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 0, pointValue: 1, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = $1/point. Index CFD specs vary by broker." },
  { symbol: "SPX500", label: "US SPX 500 (SPX500)", category: "indices", pipSize: 1, contractSize: 1, quoteCurrency: "USD", priceDecimals: 1, pointValue: 1, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = $1/point. Index CFD specs vary by broker." },
  { symbol: "GER40", label: "Germany 40 (GER40/DAX)", category: "indices", pipSize: 1, contractSize: 1, quoteCurrency: "EUR", priceDecimals: 0, pointValue: 1, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = €1/point. Index CFD specs vary by broker." },
  { symbol: "UK100", label: "UK 100 (FTSE)", category: "indices", pipSize: 1, contractSize: 1, quoteCurrency: "GBP", priceDecimals: 0, pointValue: 1, quantityStep: 0.01, note: "Indicative CFD convention: 1 lot = £1/point. Index CFD specs vary by broker." },
];

export const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "JPY", "NZD"];

export const CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  forex: "Forex",
  metals: "Metals",
  crypto: "Crypto",
  futures: "Futures",
  indices: "Indices/CFDs",
};

export function getInstrument(symbol: string): Instrument | undefined {
  return INSTRUMENTS.find((instrument) => instrument.symbol === symbol);
}

export function isTickBased(instrument: Instrument): boolean {
  return instrument.category === "futures" || instrument.category === "indices";
}

export function quantityLabel(instrument: Instrument): string {
  return instrument.category === "futures" ? "contracts" : "lots";
}
