import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import type { Trade } from "@/types/trade";
import type { TradingAccount } from "@/types/account";
import type { PlaybookSetup } from "@/types/playbook";
import type { TraderShift } from "@/lib/shifts-db";
import type { DailyPlanRecord } from "@/lib/daily-plans";

export const runtime = "nodejs";

type Row = Record<string, unknown>;

function str(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numOrString(value: unknown) {
  return value == null ? "" : typeof value === "number" ? value : String(value);
}

function bool(value: unknown) {
  return Boolean(value);
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function toNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapTrade(row: Row): Trade {
  return {
    id: str(row.id),
    date: str(row.date),
    time: str(row.time),
    instrument: str(row.instrument),
    direction: str(row.direction),
    setup: str(row.setup),
    session: str(row.session),
    timeframe: str(row.timeframe),
    emotion: str(row.emotion),
    entry: row.entry == null ? "" : numOrString(row.entry),
    sl: row.sl == null ? "" : numOrString(row.sl),
    tp: row.tp == null ? "" : numOrString(row.tp),
    rr: row.rr == null ? "" : numOrString(row.rr),
    result: row.result == null ? null : numOrString(row.result),
    pnl: row.pnl == null ? null : numOrString(row.pnl),
    account: str(row.account),
    notes: str(row.notes),
    tags: str(row.tags),
    chartUrl: str(row.chart_url),
    reviewed: bool(row.reviewed),
    executionRating: row.execution_rating == null ? "" : numOrString(row.execution_rating),
    mistake: str(row.mistake),
    lesson: str(row.lesson),
    createdAt: row.created_at,
  };
}

function mapAccount(row: Row): TradingAccount {
  return {
    id: str(row.id),
    name: str(row.name),
    firm: str(row.firm),
    type: str(row.type) || "Personal",
    status: str(row.status) || "Active",
    size: row.size == null ? "" : numOrString(row.size),
    maxDD: row.max_dd == null ? "" : numOrString(row.max_dd),
    dailyLoss: row.daily_loss == null ? "" : numOrString(row.daily_loss),
    profitTarget: row.profit_target == null ? "" : numOrString(row.profit_target),
    startingBalance: row.starting_balance == null ? "" : numOrString(row.starting_balance),
    currentBalance: row.current_balance == null ? "" : numOrString(row.current_balance),
    trailingDD: bool(row.trailing_dd),
    notes: str(row.notes),
  };
}

function mapPlaybook(row: Row): PlaybookSetup {
  return {
    id: str(row.id),
    name: str(row.name),
    status: str(row.status) || "Active",
    market: str(row.market),
    timeframe: str(row.timeframe),
    directionBias: str(row.direction_bias),
    description: str(row.description),
    entryModel: str(row.entry_model),
    invalidation: str(row.invalidation),
    targetModel: str(row.target_model),
    riskRule: str(row.risk_rule),
    rules: list(row.rules),
    mistakesToAvoid: list(row.mistakes_to_avoid),
    tags: list(row.tags),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapShift(row: Row | null | undefined): TraderShift | null {
  if (!row) return null;
  return {
    id: str(row.id),
    userId: str(row.user_id),
    clockIn: str(row.clock_in),
    clockOut: row.clock_out == null ? null : str(row.clock_out),
    sleepQuality: Number(row.sleep_quality || 0),
    stressLevel: Number(row.stress_level || 0),
    disciplineLevel: Number(row.discipline_level || 0),
    preNotes: str(row.pre_notes),
    postDiscipline: toNumberOrNull(row.post_discipline),
    emotionsFelt: str(row.emotions_felt),
    lessonsLearned: str(row.lessons_learned),
    behavioralSummary: row.behavioral_summary == null ? null : str(row.behavioral_summary),
    createdAt: str(row.created_at),
    targetProfit: toNumberOrNull(row.target_profit),
    maxDrawdownLimit: toNumberOrNull(row.max_drawdown_limit),
    sessionDurationMinutes: toNumberOrNull(row.session_duration_minutes),
  };
}

function mapDailyPlan(row: Row | null | undefined): DailyPlanRecord | null {
  if (!row) return null;
  return {
    id: str(row.id),
    userId: str(row.user_id),
    planDate: str(row.plan_date),
    riskLevel: str(row.risk_level),
    tone: str(row.tone),
    maxTrades: Number(row.max_trades || 0),
    riskPerTrade: Number(row.risk_per_trade || 0),
    riskScale: str(row.risk_scale),
    allowedSetups: list(row.allowed_setups),
    avoidList: list(row.avoid_list),
    stopRules: list(row.stop_rules),
    focus: str(row.focus),
    sourceContext: (row.source_context && typeof row.source_context === "object" && !Array.isArray(row.source_context)) ? row.source_context as Record<string, unknown> : {},
    acceptedAt: row.accepted_at == null ? null : str(row.accepted_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function isMissingDailyPlansTable(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (message.includes("daily_plans") && (message.includes("does not exist") || message.includes("schema cache")))
  );
}

function todayKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const supabase = createServerClient();
    const planDate = new URL(req.url).searchParams.get("date") || todayKey();

    const [shiftRes, tradesRes, accountsRes, playbookRes, dailyPlanRes] = await Promise.all([
      supabase
        .from("trader_shifts")
        .select("*")
        .eq("user_id", user.id)
        .is("clock_out", null)
        .maybeSingle(),
      supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("playbook")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("daily_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_date", planDate)
        .maybeSingle(),
    ]);

    if (shiftRes.error && !String(shiftRes.error.message || "").includes("does not exist")) throw shiftRes.error;
    if (tradesRes.error) throw tradesRes.error;
    if (accountsRes.error) throw accountsRes.error;
    if (playbookRes.error) throw playbookRes.error;
    if (dailyPlanRes.error && !isMissingDailyPlansTable(dailyPlanRes.error)) throw dailyPlanRes.error;

    return NextResponse.json({
      activeShift: mapShift(shiftRes.data as Row | null),
      trades: ((tradesRes.data || []) as Row[]).map(mapTrade),
      accounts: ((accountsRes.data || []) as Row[]).map(mapAccount),
      playbook: ((playbookRes.data || []) as Row[]).map(mapPlaybook),
      dailyPlan: dailyPlanRes.error ? null : mapDailyPlan(dailyPlanRes.data as Row | null),
      planDate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Dashboard summary error:", error);
    return NextResponse.json({ error: "Could not load dashboard summary." }, { status: 500 });
  }
}
