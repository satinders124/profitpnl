import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type ShiftSummaryRequest = {
  shiftId?: string | null;
  tradesCount?: number;
  realizedPnl?: number;
  postDiscipline?: number;
  emotionsFelt?: string;
  lessonsLearned?: string;
  preNotes?: string;
  sessionDurationMinutes?: number;
  clockOutAt?: string;
  sleepQuality?: number;
  stressLevel?: number;
  disciplineLevel?: number;
  targetProfit?: number;
  maxDrawdownLimit?: number;
};

type ShiftRow = {
  id: string;
  clock_in: string | null;
  clock_out: string | null;
  session_duration_minutes: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  discipline_level: number | null;
  pre_notes: string | null;
  target_profit: number | null;
  max_drawdown_limit: number | null;
};

type SessionTrade = {
  strategy_name: string | null;
  entry_price: number | string | null;
  sl_price: number | string | null;
  tp_price: number | string | null;
  exit_price: number | string | null;
  lot_size: number | string | null;
  risk_amount: number | string | null;
  potential_profit: number | string | null;
  status: string | null;
  pnl_realized: number | string | null;
  rules_followed: unknown;
  is_caution: boolean | null;
};

type SummaryContext = {
  sessionDurationMinutes: number | null;
  sessionTrades: SessionTrade[];
  realizedPnl: number;
  postDiscipline: number;
  emotionsFelt: string;
  lessonsLearned: string;
  preNotes: string;
  sleepQuality: number | null;
  stressLevel: number | null;
  disciplineLevel: number | null;
  targetProfit: number | null;
  maxDrawdownLimit: number | null;
};

function asText(value: unknown, fallback = "None") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampRating(value: unknown, fallback = 5) {
  return Math.max(1, Math.min(10, Math.round(asNumber(value, fallback))));
}

function plural(count: number, singular: string, pluralWord = `${singular}s`) {
  return count === 1 ? singular : pluralWord;
}

function formatCurrency(value: number) {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "unknown duration";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs <= 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function normalizeParagraph(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .replace(/^['"“”]+|['"“”]+$/g, "")
    .trim();
}

function tradePnlTotal(trades: SessionTrade[]) {
  return trades
    .filter((trade) => trade.status === "closed")
    .reduce((sum, trade) => sum + asNumber(trade.pnl_realized, 0), 0);
}

function buildTradeDetails(trades: SessionTrade[]) {
  return trades
    .map((trade, index) => {
      const rules = Array.isArray(trade.rules_followed) && trade.rules_followed.length > 0
        ? trade.rules_followed.join(", ")
        : "No rules ticked";
      const caution = trade.is_caution ? " Caution flag: risk exceeded shift limit." : "";
      return `${index + 1}. ${trade.strategy_name || "Manual Setup"} — Status: ${trade.status || "recorded"}; Entry: ${trade.entry_price ?? "—"}; SL: ${trade.sl_price ?? "—"}; TP: ${trade.tp_price ?? "—"}; Exit: ${trade.exit_price ?? "—"}; Lot: ${trade.lot_size ?? "—"}; Planned risk: ${formatCurrency(asNumber(trade.risk_amount, 0))}; Planned reward: ${formatCurrency(asNumber(trade.potential_profit, 0))}; Realized P&L: ${formatCurrency(asNumber(trade.pnl_realized, 0))}; Rules followed: ${rules}.${caution}`;
    })
    .join("\n");
}

function buildLocalSessionParagraph(context: SummaryContext) {
  const totalTrades = context.sessionTrades.length;
  const closedTrades = context.sessionTrades.filter((trade) => trade.status === "closed").length;
  const telemetryPnl = tradePnlTotal(context.sessionTrades);
  const pnlToUse = totalTrades > 0 ? telemetryPnl : context.realizedPnl;
  const disciplineTone = context.postDiscipline >= 8
    ? "strong emotional control"
    : context.postDiscipline >= 6
      ? "acceptable control with room to tighten execution"
      : "a clear warning that discipline slipped and risk should be reduced next session";
  const tradeSentence = totalTrades > 0
    ? `Your telemetry shows ${closedTrades} closed ${plural(closedTrades, "position")} out of ${totalTrades} tracked ${plural(totalTrades, "trade")}, finishing with ${formatCurrency(pnlToUse)} realized P&L.`
    : `No individual trade telemetry was recorded, so this report is based on your cognitive check-in, check-out notes, and reported P&L of ${formatCurrency(context.realizedPnl)}.`;
  const planSentence = [
    context.targetProfit !== null ? `profit target ${formatCurrency(context.targetProfit)}` : null,
    context.maxDrawdownLimit !== null ? `daily loss limit ${formatCurrency(context.maxDrawdownLimit)}` : null,
  ].filter(Boolean).join(" and ");
  const preShiftSentence = context.preNotes === "None"
    ? "You did not leave a detailed pre-shift plan, which makes it harder to grade whether the session followed a defined process"
    : `Your pre-shift plan was: “${context.preNotes}”`;
  const lessonSentence = context.lessonsLearned === "None"
    ? "Before the next session, write one concrete lesson so the next clock-in has a behavioral rule to measure"
    : `The key lesson you logged was: “${context.lessonsLearned}”`;

  return normalizeParagraph(
    `Your AI Risk-Guard session is complete after ${formatDuration(context.sessionDurationMinutes)}${planSentence ? ` against a planned ${planSentence}` : ""}. ${tradeSentence} You rated end-of-session discipline at ${context.postDiscipline}/10, which suggests ${disciplineTone}; the emotions you logged were “${context.emotionsFelt}”. ${preShiftSentence}. ${lessonSentence}. For the next session, keep position risk inside your daily limit, only engage verified playbook setups, and take a hard pause if the same emotional trigger appears again.`
  );
}

async function safeParseBody(req: Request): Promise<ShiftSummaryRequest> {
  try {
    const parsed = await req.json();
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const body = await safeParseBody(req);

  const postDiscipline = clampRating(body.postDiscipline, 5);
  const emotionsFelt = asText(body.emotionsFelt);
  const lessonsLearned = asText(body.lessonsLearned);
  const bodyPreNotes = asText(body.preNotes);
  const realizedPnl = asNumber(body.realizedPnl, 0);
  const bodyDuration = asOptionalNumber(body.sessionDurationMinutes);
  const clockOutAt = asText(body.clockOutAt, "");
  const fallbackContext: SummaryContext = {
    sessionDurationMinutes: bodyDuration,
    sessionTrades: [],
    realizedPnl,
    postDiscipline,
    emotionsFelt,
    lessonsLearned,
    preNotes: bodyPreNotes,
    sleepQuality: asOptionalNumber(body.sleepQuality),
    stressLevel: asOptionalNumber(body.stressLevel),
    disciplineLevel: asOptionalNumber(body.disciplineLevel),
    targetProfit: asOptionalNumber(body.targetProfit),
    maxDrawdownLimit: asOptionalNumber(body.maxDrawdownLimit),
  };

  try {
    const user = await getAuthenticatedUser(req);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabase = createServerClient();

    let actualShiftId = body.shiftId || null;
    let sessionTrades: SessionTrade[] = [];
    let shiftRow: ShiftRow | null = null;

    try {
      if (!actualShiftId) {
        const { data: latestShift } = await supabase
          .from("trader_shifts")
          .select("id")
          .eq("user_id", user.id)
          .order("clock_in", { ascending: false })
          .limit(1)
          .maybeSingle();
        actualShiftId = latestShift?.id || null;
      }

      if (actualShiftId) {
        const [{ data: trades }, { data: shift }] = await Promise.all([
          supabase
            .from("running_trades")
            .select("strategy_name, entry_price, sl_price, tp_price, exit_price, lot_size, risk_amount, potential_profit, status, pnl_realized, rules_followed, is_caution")
            .eq("shift_id", actualShiftId)
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("trader_shifts")
            .select("id, clock_in, clock_out, session_duration_minutes, sleep_quality, stress_level, discipline_level, pre_notes, target_profit, max_drawdown_limit")
            .eq("id", actualShiftId)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        sessionTrades = (trades || []) as SessionTrade[];
        shiftRow = (shift || null) as ShiftRow | null;
      }
    } catch (dbErr) {
      console.error("DB query error in shift-summary:", dbErr);
    }

    let sessionDurationMinutes = bodyDuration;
    if (!sessionDurationMinutes && shiftRow?.session_duration_minutes) {
      sessionDurationMinutes = Number(shiftRow.session_duration_minutes);
    }
    if (!sessionDurationMinutes && shiftRow?.clock_in) {
      const endTime = clockOutAt || shiftRow.clock_out || new Date().toISOString();
      const durationMs = new Date(endTime).getTime() - new Date(shiftRow.clock_in).getTime();
      if (Number.isFinite(durationMs) && durationMs > 0) {
        sessionDurationMinutes = Math.max(1, Math.round(durationMs / 60000));
      }
    }

    const context: SummaryContext = {
      sessionDurationMinutes,
      sessionTrades,
      realizedPnl,
      postDiscipline,
      emotionsFelt,
      lessonsLearned,
      preNotes: bodyPreNotes !== "None" ? bodyPreNotes : asText(shiftRow?.pre_notes),
      sleepQuality: asOptionalNumber(body.sleepQuality) ?? asOptionalNumber(shiftRow?.sleep_quality),
      stressLevel: asOptionalNumber(body.stressLevel) ?? asOptionalNumber(shiftRow?.stress_level),
      disciplineLevel: asOptionalNumber(body.disciplineLevel) ?? asOptionalNumber(shiftRow?.discipline_level),
      targetProfit: asOptionalNumber(body.targetProfit) ?? asOptionalNumber(shiftRow?.target_profit),
      maxDrawdownLimit: asOptionalNumber(body.maxDrawdownLimit) ?? asOptionalNumber(shiftRow?.max_drawdown_limit),
    };

    const localFallback = buildLocalSessionParagraph(context);

    if (!apiKey || apiKey.startsWith("your_")) {
      return NextResponse.json({ summary: localFallback, aiGenerated: false });
    }

    const closedTrades = sessionTrades.filter((trade) => trade.status === "closed").length;
    const telemetryPnl = tradePnlTotal(sessionTrades);
    const systemPrompt = `You are ProfitPnL's AI Risk-Guard trading psychology coach. Write exactly one polished, human, session-end report paragraph for the trader's "Read Full Report" modal after they clock out. Keep it between 110 and 170 words. Do not use headings, bullet points, markdown tables, apologies, configuration notes, or line breaks. Be specific and practical: mention session duration, trade telemetry, realized P&L, discipline rating, emotions, pre-shift plan, lesson learned, and one concrete action for the next session. If trade telemetry is empty, say that clearly and analyze the check-in/check-out data instead. Sound warm, direct, and professional — not generic.`;

    const userPrompt = `Trader: ${user.email || "Unknown"}
Session Duration: ${formatDuration(context.sessionDurationMinutes)}
Pre-Session Sleep Quality: ${context.sleepQuality ?? "not recorded"}/10
Pre-Session Stress: ${context.stressLevel ?? "not recorded"}/10
Pre-Session Discipline: ${context.disciplineLevel ?? "not recorded"}/10
Profit Target: ${context.targetProfit !== null ? formatCurrency(context.targetProfit) : "not recorded"}
Daily Loss Limit: ${context.maxDrawdownLimit !== null ? formatCurrency(context.maxDrawdownLimit) : "not recorded"}
Completed / Closed Trades: ${closedTrades} / ${sessionTrades.length}
Realized P&L From Closed Trades: ${formatCurrency(telemetryPnl)}
User-Reported Realized P&L: ${formatCurrency(realizedPnl)}
End-of-Session Discipline Rating: ${postDiscipline}/10
Pre-Shift Notes: "${context.preNotes}"
Emotions Felt: "${emotionsFelt}"
Lessons Learned: "${lessonsLearned}"
Actual Trade Telemetry:
${buildTradeDetails(sessionTrades) || "No individual trade telemetry recorded."}`;

    const anthropic = new Anthropic({ apiKey });

    let availableIds: string[] = [];
    try {
      const modelsRes = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        if (Array.isArray(modelsData?.data)) {
          availableIds = modelsData.data.map((model: { id?: string }) => model.id).filter(Boolean) as string[];
        }
      }
    } catch (e) {
      console.warn("Could not query /v1/models:", e);
    }

    const modelsToTry = Array.from(new Set([
      process.env.ANTHROPIC_MODEL,
      "claude-sonnet-5",
      ...availableIds.filter((id) => id.includes("sonnet")),
      ...availableIds,
      "claude-3-7-sonnet-20250219",
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-latest",
      "claude-3-haiku-20240307",
    ].filter(Boolean))) as string[];

    let summary = "";
    let lastErr = "";

    for (const model of modelsToTry) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        const text = response.content
          .map((part) => (part.type === "text" ? part.text : ""))
          .join(" ");
        summary = normalizeParagraph(text);
        if (summary) break;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        console.warn(`Shift-summary model ${model} failed:`, lastErr);
      }
    }

    return NextResponse.json({
      summary: summary || localFallback,
      aiGenerated: !!summary,
      ...(summary ? {} : { warning: lastErr || "AI model did not return text; local paragraph saved." }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("AI Shift Generator error:", error);
    return NextResponse.json({
      summary: buildLocalSessionParagraph(fallbackContext),
      aiGenerated: false,
      warning: message,
    });
  }
}
