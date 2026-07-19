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

export type DailyPlanAiBrief = {
  title: string;
  summary: string;
  bullets: string[];
  action: string;
  aiGenerated: boolean;
  generatedAt: string | null;
};

export type DailyPlanRecord = DailyPlanPayload & {
  id: string;
  userId: string;
  planDate: string;
  sourceContext: Record<string, unknown>;
  aiBrief: DailyPlanAiBrief | null;
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
  ai_title?: string | null;
  ai_summary?: string | null;
  ai_bullets?: unknown;
  ai_action?: string | null;
  ai_generated_at?: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingDailyPlansTable(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    message.includes("daily_plans") && (message.includes("does not exist") || message.includes("schema cache")) ||
    message.includes("ai_title") ||
    message.includes("ai_summary") ||
    message.includes("ai_bullets") ||
    message.includes("ai_action") ||
    message.includes("ai_generated_at")
  );
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function mapRow(row: DailyPlanRow): DailyPlanRecord {
  const aiSummary = typeof row.ai_summary === "string" ? row.ai_summary.trim() : "";
  const aiBrief: DailyPlanAiBrief | null = aiSummary
    ? {
        title: row.ai_title || "AI pre-market briefing",
        summary: aiSummary,
        bullets: list(row.ai_bullets).slice(0, 3),
        action: row.ai_action || "Follow the locked Daily Plan before taking the next trade.",
        aiGenerated: true,
        generatedAt: row.ai_generated_at || row.updated_at || null,
      }
    : null;

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
    aiBrief,
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

export async function saveDailyPlanInsight(
  uid: string,
  planDate: string,
  plan: DailyPlanPayload,
  sourceContext: Record<string, unknown> | undefined,
  insight: Pick<DailyPlanAiBrief, "title" | "summary" | "bullets" | "action" | "aiGenerated">
): Promise<DailyPlanRecord | null> {
  const supabase = createClient();
  const generatedAt = new Date().toISOString();
  const row = {
    ...toRow(uid, planDate, plan, sourceContext),
    ai_title: insight.title || "AI pre-market briefing",
    ai_summary: insight.summary || "",
    ai_bullets: Array.isArray(insight.bullets) ? insight.bullets.slice(0, 3) : [],
    ai_action: insight.action || "Follow the locked Daily Plan before taking the next trade.",
    ai_generated_at: generatedAt,
  };

  const { data, error } = await supabase
    .from("daily_plans")
    .upsert(row, { onConflict: "user_id,plan_date" })
    .select("*")
    .single();

  if (error) {
    if (isMissingDailyPlansTable(error)) return null;
    throw error;
  }

  return data ? mapRow(data as DailyPlanRow) : null;
}
