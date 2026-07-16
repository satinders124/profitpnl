import { createClient } from "@/lib/supabase-client";
import { Trade } from "@/types/trade";
import { TradingAccount } from "@/types/account";
import { PlaybookSetup } from "@/types/playbook";
import { JournalEntry } from "@/types/journal";

// ═══════════════════════════════════════════
// Profile (user settings)
// ═══════════════════════════════════════════

export async function getProfile(uid: string, customClient?: any) {
  const supabase = customClient || createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(uid: string, updates: Record<string, unknown>) {
  const supabase = createClient();
  
  // 🛡️ SECURITY: Whitelist fields that can be updated via the browser client.
  // Never allow updating plan, plan_source, or payment-related fields here.
  const allowedFields = [
    "display_name",
    "bio",
    "currency",
    "timezone",
    "notifications",
    "sound_effects",
    "tradingview_username",
    "initial_account_size",
    "default_risk_percentage",
    "default_commission",
    "auto_calculate_r",
    "daily_loss_limit",
    "max_drawdown_limit",
    "daily_profit_target",
    "max_consecutive_losses",
    "enforce_review",
    "active_broker",
    "connected_brokers",
    "webhook_url",
    "api_key",
    "setup_tags",
    "mistake_tags",
    "psychology_tags",
  ];

  const filteredUpdates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      filteredUpdates[key] = updates[key];
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(filteredUpdates)
    .eq("id", uid);

  if (error) throw error;
}

// ═══════════════════════════════════════════
// Trades
// ═══════════════════════════════════════════

export async function getTrades(uid: string, customClient?: any): Promise<Trade[]> {
  const supabase = customClient || createClient();
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date || "",
    time: row.time || "",
    instrument: row.instrument || "",
    direction: row.direction || "",
    setup: row.setup || "",
    session: row.session || "",
    timeframe: row.timeframe || "",
    emotion: row.emotion || "",
    entry: row.entry ?? "",
    sl: row.sl ?? "",
    tp: row.tp ?? "",
    rr: row.rr ?? "",
    result: row.result ?? null,
    pnl: row.pnl ?? null,
    account: row.account || "",
    notes: row.notes || "",
    tags: row.tags || "",
    chartUrl: row.chart_url || "",
    reviewed: row.reviewed || false,
    executionRating: row.execution_rating ?? "",
    mistake: row.mistake || "",
    lesson: row.lesson || "",
    createdAt: row.created_at,
  }));
}

export async function saveTrade(uid: string, trade: Partial<Trade>) {
  const supabase = createClient();

  const row: Record<string, unknown> = {
    user_id: uid,
    date: trade.date || null,
    time: trade.time || "",
    instrument: trade.instrument || "",
    direction: trade.direction || "",
    setup: trade.setup || "",
    session: trade.session || "",
    timeframe: trade.timeframe || "",
    emotion: trade.emotion || "",
    entry: trade.entry !== undefined && trade.entry !== "" ? Number(trade.entry) : null,
    sl: trade.sl !== undefined && trade.sl !== "" ? Number(trade.sl) : null,
    tp: trade.tp !== undefined && trade.tp !== "" ? Number(trade.tp) : null,
    rr: trade.rr !== undefined && trade.rr !== "" ? Number(trade.rr) : null,
    result: trade.result !== undefined && trade.result !== "" && trade.result !== null ? Number(trade.result) : null,
    pnl: trade.pnl !== undefined && trade.pnl !== "" && trade.pnl !== null ? Number(trade.pnl) : null,
    account: trade.account || "",
    notes: trade.notes || "",
    tags: trade.tags || "",
    chart_url: trade.chartUrl || "",
    reviewed: trade.reviewed || false,
    execution_rating: trade.executionRating !== undefined && trade.executionRating !== "" ? Number(trade.executionRating) : null,
    mistake: trade.mistake || "",
    lesson: trade.lesson || "",
  };

  if (trade.id) {
    // Update existing trade
    const { error } = await supabase
      .from("trades")
      .update(row)
      .eq("id", trade.id)
      .eq("user_id", uid);
    if (error) throw error;
    return trade.id;
  } else {
    // Insert new trade
    const { data, error } = await supabase
      .from("trades")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteTrade(uid: string, tradeId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", tradeId)
    .eq("user_id", uid);
  if (error) throw error;
}

// ═══════════════════════════════════════════
// Accounts (Trading accounts)
// ═══════════════════════════════════════════

export async function getAccounts(uid: string, customClient?: any): Promise<TradingAccount[]> {
  const supabase = customClient || createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name || "",
    firm: row.firm || "",
    type: row.type || "Personal",
    status: row.status || "Active",
    size: row.size ?? "",
    maxDD: row.max_dd ?? "",
    dailyLoss: row.daily_loss ?? "",
    profitTarget: row.profit_target ?? "",
    startingBalance: row.starting_balance ?? "",
    currentBalance: row.current_balance ?? "",
    trailingDD: row.trailing_dd || false,
    notes: row.notes || "",
  }));
}

export async function saveAccount(uid: string, account: Partial<TradingAccount>) {
  const supabase = createClient();

  const row: Record<string, unknown> = {
    user_id: uid,
    name: account.name || "",
    firm: account.firm || "",
    type: account.type || "Personal",
    status: account.status || "Active",
    size: account.size !== undefined && account.size !== "" ? Number(account.size) : null,
    max_dd: account.maxDD !== undefined && account.maxDD !== "" ? Number(account.maxDD) : null,
    daily_loss: account.dailyLoss !== undefined && account.dailyLoss !== "" ? Number(account.dailyLoss) : null,
    profit_target: account.profitTarget !== undefined && account.profitTarget !== "" ? Number(account.profitTarget) : null,
    starting_balance: account.startingBalance !== undefined && account.startingBalance !== "" ? Number(account.startingBalance) : null,
    current_balance: account.currentBalance !== undefined && account.currentBalance !== "" ? Number(account.currentBalance) : null,
    trailing_dd: account.trailingDD || false,
    notes: account.notes || "",
  };

  if (account.id) {
    const { error } = await supabase
      .from("accounts")
      .update(row)
      .eq("id", account.id)
      .eq("user_id", uid);
    if (error) throw error;
    return account.id;
  } else {
    const { data, error } = await supabase
      .from("accounts")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteAccount(uid: string, accountId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", uid);
  if (error) throw error;
}

// ═══════════════════════════════════════════
// Playbook (Strategy setups)
// ═══════════════════════════════════════════

export async function getPlaybook(uid: string, customClient?: any): Promise<PlaybookSetup[]> {
  const supabase = customClient || createClient();
  const { data, error } = await supabase
    .from("playbook")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name || "",
    status: row.status || "Active",
    market: row.market || "",
    timeframe: row.timeframe || "",
    directionBias: row.direction_bias || "",
    description: row.description || "",
    entryModel: row.entry_model || "",
    invalidation: row.invalidation || "",
    targetModel: row.target_model || "",
    riskRule: row.risk_rule || "",
    rules: row.rules || [],
    mistakesToAvoid: row.mistakes_to_avoid || [],
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function savePlaybookSetup(uid: string, setup: Partial<PlaybookSetup>) {
  const supabase = createClient();

  const row: Record<string, unknown> = {
    user_id: uid,
    name: setup.name || "",
    status: setup.status || "Active",
    market: setup.market || "",
    timeframe: setup.timeframe || "",
    direction_bias: setup.directionBias || "",
    description: setup.description || "",
    entry_model: setup.entryModel || "",
    invalidation: setup.invalidation || "",
    target_model: setup.targetModel || "",
    risk_rule: setup.riskRule || "",
    rules: setup.rules || [],
    mistakes_to_avoid: setup.mistakesToAvoid || [],
    tags: setup.tags || [],
  };

  if (setup.id) {
    const { error } = await supabase
      .from("playbook")
      .update(row)
      .eq("id", setup.id)
      .eq("user_id", uid);
    if (error) throw error;
    return setup.id;
  } else {
    const { data, error } = await supabase
      .from("playbook")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }
}

export async function deletePlaybookSetup(uid: string, setupId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("playbook")
    .delete()
    .eq("id", setupId)
    .eq("user_id", uid);
  if (error) throw error;
}

// ═══════════════════════════════════════════
// Journals (Psychology journal)
// ═══════════════════════════════════════════

export async function getJournals(uid: string, customClient?: any): Promise<JournalEntry[]> {
  const supabase = customClient || createClient();
  const { data, error } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date || "",
    mood: row.mood || "",
    notes: row.notes || "",
    text: row.text || "",
    entry: row.entry || "",
    tags: row.tags || [],
    createdAt: row.created_at,
  }));
}

export async function saveJournal(uid: string, journal: Partial<JournalEntry>) {
  const supabase = createClient();

  const row: Record<string, unknown> = {
    user_id: uid,
    date: journal.date || null,
    mood: journal.mood || "",
    notes: journal.notes || "",
    text: journal.text || "",
    entry: journal.entry || "",
    tags: journal.tags || [],
  };

  if (journal.id) {
    const { error } = await supabase
      .from("journals")
      .update(row)
      .eq("id", journal.id)
      .eq("user_id", uid);
    if (error) throw error;
    return journal.id;
  } else {
    const { data, error } = await supabase
      .from("journals")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteJournal(uid: string, journalId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("journals")
    .delete()
    .eq("id", journalId)
    .eq("user_id", uid);
  if (error) throw error;
}
