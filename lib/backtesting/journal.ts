import { createClient } from "@/lib/supabase-client";
import { Trade } from "@/types/trade";
import { PlaybookSetup } from "@/types/playbook";

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {};
  } catch {
    return {};
  }
}

export type BacktestModel = {
  id: string;
  user_id: string;
  name: string;
  symbol: string | null;
  market: string | null;
  timeframe: string | null;
  start_date: string | null;
  end_date: string | null;
  starting_balance: number;
  current_balance: number | null;
  status: string;
  notes: string | null;
  kind: "lab" | "journal";
  rules: string[];
  created_at: string;
  updated_at: string;
};

export type BacktestJournalTrade = {
  id: string;
  session_id: string;
  user_id: string;
  symbol: string | null;
  side: "long" | "short";
  entry_time: string;
  exit_time: string;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number | null;
  risk_amount: number | null;
  pnl: number | null;
  r_multiple: number | null;
  balance_after: number | null;
  exit_reason: string;
  fees: number;
  setup: string | null;
  notes: string | null;
  rule_ticks: boolean[];
  be: number | null;
  deviations: string | null;
  psychology: string | null;
  result: string | null;
  risk: number | null;
  risk_unit: "currency" | "percent";
  trade_date: string | null;
  created_at: string;
};

export type BacktestProfile = {
  user_id: string;
  account_size: number;
  currency: string;
};

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || "Request failed");
  }
  return data;
}

// ── Client-side cache ────────────────────────────────────────────────
// Persists across SPA navigations so switching between Dashboard /
// Analytics / Trades / Playbook in Backtesting mode doesn't re-fetch
// everything. Invalidated on every mutation below.
let _models: BacktestModel[] | null = null;
let _profile: BacktestProfile | null | undefined = undefined;
const _trades = new Map<string, BacktestJournalTrade[]>();
const _modelDetail = new Map<string, { session: BacktestModel; trades: BacktestJournalTrade[] }>();
let _allTrades: BacktestJournalTrade[] | null = null;

export function clearBacktestCache() {
  _models = null;
  _profile = undefined;
  _trades.clear();
  _modelDetail.clear();
  _allTrades = null;
}

export async function getModels(): Promise<BacktestModel[]> {
  if (_models) return _models;
  const res = await fetch(`/api/backtests/sessions?kind=journal`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  _models = (data.sessions || []) as BacktestModel[];
  return _models;
}

export async function createModel(
  payload: Partial<BacktestModel> & { rules?: string[] }
) {
  const res = await fetch(`/api/backtests/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ ...payload, kind: "journal" }),
  });
  _models = null;
  _allTrades = null;
  return jsonOrThrow(res);
}

export async function getModel(
  id: string
): Promise<{ session: BacktestModel; trades: BacktestJournalTrade[] }> {
  const cached = _modelDetail.get(id);
  if (cached) return cached;
  const res = await fetch(`/api/backtests/sessions/${id}`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  _modelDetail.set(id, data);
  return data;
}

export async function updateModel(id: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/backtests/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  _models = null;
  _modelDetail.delete(id);
  return jsonOrThrow(res);
}

export async function deleteModel(id: string) {
  const res = await fetch(`/api/backtests/sessions/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  _models = null;
  _modelDetail.delete(id);
  _trades.delete(id);
  _allTrades = null;
  return jsonOrThrow(res);
}

export async function getTrades(
  sessionId: string
): Promise<BacktestJournalTrade[]> {
  const cached = _trades.get(sessionId);
  if (cached) return cached;
  const res = await fetch(`/api/backtests/sessions/${sessionId}/trades`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  const trades = (data.trades || []) as BacktestJournalTrade[];
  _trades.set(sessionId, trades);
  return trades;
}

export async function getJournalTrades(): Promise<BacktestJournalTrade[]> {
  if (_allTrades) return _allTrades;
  const res = await fetch(`/api/backtests/trades`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  _allTrades = (data.trades || []) as BacktestJournalTrade[];
  return _allTrades;
}

export async function createTrade(
  sessionId: string,
  payload: Record<string, unknown>
) {
  const res = await fetch(`/api/backtests/sessions/${sessionId}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  _trades.delete(sessionId);
  _allTrades = null;
  _models = null;
  return jsonOrThrow(res);
}

export async function updateTrade(id: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/backtests/trades/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  _trades.delete(id);
  _allTrades = null;
  return jsonOrThrow(res);
}

export async function deleteTrade(id: string) {
  const res = await fetch(`/api/backtests/trades/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  _trades.delete(id);
  _allTrades = null;
  _models = null;
  return jsonOrThrow(res);
}

export async function getProfile(): Promise<BacktestProfile | null> {
  if (_profile !== undefined) return _profile;
  const res = await fetch(`/api/backtests/profile`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  _profile = ((data as { profile?: BacktestProfile | null }).profile ||
    null) as BacktestProfile | null;
  return _profile;
}

export async function saveProfile(accountSize: number, currency: string) {
  const res = await fetch(`/api/backtests/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ accountSize, currency }),
  });
  _profile = undefined;
  return jsonOrThrow(res);
}

/**
 * Maps a backtested journal trade into the live `Trade` shape so every
 * existing chart / stat / breakdown (calcStats, directionStats,
 * buildEquityPoints, getSetupPerformance, TradeReviewCard, SetupCard…)
 * works unchanged. `result` is expressed as an R-multiple so the whole
 * analytics engine treats backtest trades exactly like live ones.
 */
export function toTrade(
  bt: BacktestJournalTrade,
  model: BacktestModel
): Trade {
  const result = outcomeToR(bt.result);
  const ticks = bt.rule_ticks || [];
  const followed = ticks.filter(Boolean).length;
  const adherence = ticks.length > 0 ? Math.round((followed / ticks.length) * 5) : 0;

  const entry = bt.entry_price;
  const sl = bt.stop_loss;
  const tp = bt.take_profit;
  let rr: number | undefined;
  if (entry && sl && tp && entry !== sl) {
    const risk = Math.abs(entry - sl);
    const reward = bt.side === "long" ? tp - entry : entry - tp;
    if (risk > 0) rr = Number((reward / risk).toFixed(2));
  }

  const notes = [bt.deviations, bt.psychology].filter(Boolean).join("\n\n");

  return {
    id: bt.id,
    date: bt.trade_date || "",
    instrument: bt.symbol || "Backtest",
    direction: bt.side === "long" ? "LONG" : "SHORT",
    setup: model.name,
    account: model.name,
    session: [model.market, model.timeframe].filter(Boolean).join(" ") || undefined,
    entry: entry ?? undefined,
    sl: sl ?? undefined,
    tp: tp ?? undefined,
    rr,
    result,
    pnl: bt.pnl,
    reviewed: true,
    executionRating: ticks.length > 0 ? adherence : undefined,
    notes: notes || undefined,
    createdAt: bt.created_at,
  };
}

/**
 * Maps a backtest model into the live `PlaybookSetup` shape so the Playbook
 * page can render identical UI (SetupCard + calcSetupStats) for backtests.
 * `name` carries through, which is what the strategy/trade matching keys on.
 */
export function toPlaybookSetup(model: BacktestModel): PlaybookSetup {
  return {
    id: model.id,
    name: model.name,
    status: model.status || "Active",
    market: model.market || undefined,
    timeframe: model.timeframe || undefined,
    description: model.notes || undefined,
    rules: model.rules || [],
    mistakesToAvoid: [],
    tags: [],
    createdAt: model.created_at,
    updatedAt: model.updated_at,
  };
}

function outcomeToR(result: string | null): number | null {
  const r = (result || "").trim().toLowerCase();
  if (r === "win" || r.includes("win")) return 1;
  if (r === "loss" || r.includes("loss")) return -1;
  if (r === "be" || r.includes("breakeven") || r.includes("break even")) return 0;
  return null;
}
