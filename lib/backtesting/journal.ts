import { createClient } from "@/lib/supabase-client";

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

export async function getModels(): Promise<BacktestModel[]> {
  const res = await fetch(`/api/backtests/sessions?kind=journal`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  return (data.sessions || []) as BacktestModel[];
}

export async function createModel(
  payload: Partial<BacktestModel> & { rules?: string[] }
) {
  const res = await fetch(`/api/backtests/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ ...payload, kind: "journal" }),
  });
  return jsonOrThrow(res);
}

export async function getModel(
  id: string
): Promise<{ session: BacktestModel; trades: BacktestJournalTrade[] }> {
  const res = await fetch(`/api/backtests/sessions/${id}`, {
    headers: await authHeaders(),
  });
  return jsonOrThrow(res);
}

export async function updateModel(id: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/backtests/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow(res);
}

export async function deleteModel(id: string) {
  const res = await fetch(`/api/backtests/sessions/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return jsonOrThrow(res);
}

export async function getTrades(
  sessionId: string
): Promise<BacktestJournalTrade[]> {
  const res = await fetch(`/api/backtests/sessions/${sessionId}/trades`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  return (data.trades || []) as BacktestJournalTrade[];
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
  return jsonOrThrow(res);
}

export async function updateTrade(id: string, patch: Record<string, unknown>) {
  const res = await fetch(`/api/backtests/trades/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow(res);
}

export async function deleteTrade(id: string) {
  const res = await fetch(`/api/backtests/trades/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  return jsonOrThrow(res);
}

export async function getProfile(): Promise<BacktestProfile | null> {
  const res = await fetch(`/api/backtests/profile`, {
    headers: await authHeaders(),
  });
  const data = await jsonOrThrow(res);
  return ((data as { profile?: BacktestProfile | null }).profile ||
    null) as BacktestProfile | null;
}

export async function saveProfile(accountSize: number, currency: string) {
  const res = await fetch(`/api/backtests/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ accountSize, currency }),
  });
  return jsonOrThrow(res);
}
