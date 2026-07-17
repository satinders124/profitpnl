import { createClient } from "@/lib/supabase-client";

export type DailyPlanPayload = {
  riskLevel: "Cleared" | "Caution" | "Defense Mode" | string;
  tone: "green" | "gold" | "red" | string;
  maxTrades: number;
  riskPerTrade: number;
  riskScale: string;
  allowedSetups: string[];
  avoidList: string[];
  stopRules: string[];
  focus: string;
};

export type DailyPlanRecord = DailyPlanPayload & {
  id: string;
  userId: string;
  planDate: string;
  sourceContext: Record<string, unknown>;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DailyPlanRow = {
  id: string;
  user_id: string;
  plan_date: string;
  risk_level: string;
  tone: string;
  max_trades: number;
  risk_per_trade: number | string | null;
  risk_scale: string | null;
  allowed_setups: unknown;
  avoid_list: unknown;
  stop_rules: unknown;
  focus: string | null;
  source_context: Record<string, unknown> | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingDailyPlansTable(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("daily_plans") && (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function mapRow(row: DailyPlanRow): DailyPlanRecord {
  return {
    id: row.id,
    userId: row.user_id,
    planDate: row.plan_date,
    riskLevel: row.risk_level,
    tone: row.tone,
    maxTrades: Number(row.max_trades || 0),
    riskPerTrade: Number(row.risk_per_trade || 0),
    riskScale: row.risk_scale || "",
    allowedSetups: list(row.allowed_setups),
    avoidList: list(row.avoid_list),
    stopRules: list(row.stop_rules),
    focus: row.focus || "",
    sourceContext: row.source_context || {},
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(uid: string, planDate: string, plan: DailyPlanPayload, sourceContext?: Record<string, unknown>, acceptedAt?: string | null) {
  return {
    user_id: uid,
    plan_date: planDate,
    risk_level: plan.riskLevel,
    tone: plan.tone === "green" || plan.tone === "red" ? plan.tone : "gold",
    max_trades: Number(plan.maxTrades || 0),
    risk_per_trade: Number(plan.riskPerTrade || 0),
    risk_scale: plan.riskScale || "",
    allowed_setups: plan.allowedSetups || [],
    avoid_list: plan.avoidList || [],
    stop_rules: plan.stopRules || [],
    focus: plan.focus || "",
    source_context: sourceContext || {},
    ...(acceptedAt !== undefined ? { accepted_at: acceptedAt } : {}),
    updated_at: new Date().toISOString(),
  };
}

export async function getDailyPlan(uid: string, planDate: string): Promise<DailyPlanRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", uid)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (error) {
    if (isMissingDailyPlansTable(error)) {
      console.warn("daily_plans table missing. Run the latest Supabase migration to enable cloud-synced plans.");
      return null;
    }
    throw error;
  }

  return data ? mapRow(data as DailyPlanRow) : null;
}

export async function upsertDailyPlan(
  uid: string,
  planDate: string,
  plan: DailyPlanPayload,
  sourceContext?: Record<string, unknown>
): Promise<DailyPlanRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_plans")
    .upsert(toRow(uid, planDate, plan, sourceContext), { onConflict: "user_id,plan_date" })
    .select("*")
    .single();

  if (error) {
    if (isMissingDailyPlansTable(error)) return null;
    throw error;
  }

  return data ? mapRow(data as DailyPlanRow) : null;
}

export async function acceptDailyPlan(
  uid: string,
  planDate: string,
  plan: DailyPlanPayload,
  sourceContext?: Record<string, unknown>
): Promise<DailyPlanRecord | null> {
  const supabase = createClient();
  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("daily_plans")
    .upsert(toRow(uid, planDate, plan, sourceContext, acceptedAt), { onConflict: "user_id,plan_date" })
    .select("*")
    .single();

  if (error) {
    if (isMissingDailyPlansTable(error)) return null;
    throw error;
  }

  return data ? mapRow(data as DailyPlanRow) : null;
}
