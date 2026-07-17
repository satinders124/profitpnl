import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { getAuthenticatedUser } from "@/lib/auth-utils";

export const runtime = "nodejs";

type TradeReviewRequest = {
  trade?: Record<string, unknown>;
  draft?: Record<string, unknown>;
};

type TradeAiReview = {
  diagnosis: string;
  issueType: "Strategy" | "Execution" | "Risk" | "Psychology" | "Data Quality";
  suggestedEmotion: string;
  suggestedMistake: string;
  suggestedLesson: string;
  nextRule: string;
  notes: string;
  confidence: "High" | "Medium" | "Low";
  aiGenerated: boolean;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIssueType(value: unknown): TradeAiReview["issueType"] {
  const text = asText(value).toLowerCase();
  if (text.includes("strategy")) return "Strategy";
  if (text.includes("risk")) return "Risk";
  if (text.includes("psych")) return "Psychology";
  if (text.includes("data")) return "Data Quality";
  return "Execution";
}

function normalizeConfidence(value: unknown): TradeAiReview["confidence"] {
  const text = asText(value).toLowerCase();
  if (text.includes("high")) return "High";
  if (text.includes("low")) return "Low";
  return "Medium";
}

function localReview(trade: Record<string, unknown> = {}, draft: Record<string, unknown> = {}): TradeAiReview {
  const result = asNumber(draft.result ?? trade.result, 0);
  const pnl = asNumber(draft.pnl ?? trade.pnl, 0);
  const notes = asText(draft.notes ?? trade.notes);
  const existingEmotion = asText(draft.emotion ?? trade.emotion);
  const existingMistake = asText(draft.mistake ?? trade.mistake);
  const setup = asText(trade.setup, "this setup");

  let issueType: TradeAiReview["issueType"] = "Execution";
  let suggestedEmotion = existingEmotion || "Calm";
  let suggestedMistake = existingMistake || "None";
  let diagnosis = `This ${setup} trade needs a completed review so the journal can separate execution quality from outcome.`;
  let suggestedLesson = "Write one specific rule that would improve the next execution of this setup.";
  let nextRule = "Do not place the next trade until the setup, risk, emotion, mistake, and lesson are logged.";

  if (result < 0 || pnl < 0) {
    issueType = notes.toLowerCase().includes("revenge") || existingEmotion.toLowerCase().includes("revenge") ? "Psychology" : "Execution";
    suggestedEmotion = existingEmotion || (notes.toLowerCase().includes("fomo") ? "FOMO" : "Anxious");
    suggestedMistake = existingMistake || (notes.toLowerCase().includes("stop") ? "Moved stop" : notes.toLowerCase().includes("late") ? "Late entry" : "Chased");
    diagnosis = "This losing trade should be treated as a process audit first. Identify whether the loss came from entry timing, risk control, or emotional decision-making before taking another setup.";
    suggestedLesson = "Losses are acceptable only when the entry, stop, and risk were executed exactly as planned; if the trade was chased or emotional, the lesson is to skip the next similar trigger.";
    nextRule = "After a losing trade, pause for 10 minutes and take the next setup only if every checklist rule is still valid.";
  } else if (result > 0 || pnl > 0) {
    diagnosis = "This winner still needs review. The goal is to identify what was repeatable, not just celebrate the outcome.";
    suggestedEmotion = existingEmotion || "Confident";
    suggestedMistake = existingMistake || "None";
    suggestedLesson = "Repeat the specific conditions that made this trade clean, and avoid increasing size just because the last result was positive.";
    nextRule = "For the next trade, keep risk fixed and only repeat this setup if the same confirmation conditions appear.";
  }

  return {
    diagnosis,
    issueType,
    suggestedEmotion,
    suggestedMistake,
    suggestedLesson,
    nextRule,
    notes: `${diagnosis}\n\nNext rule: ${nextRule}`,
    confidence: "Medium",
    aiGenerated: false,
  };
}

function stripMarkdownFences(raw: string) {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractBalancedJson(raw: string) {
  const cleaned = stripMarkdownFences(raw);
  const start = cleaned.indexOf("{");
  if (start < 0) return cleaned;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return cleaned.slice(start, i + 1);
  }
  return cleaned;
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
}

function extractStringField(raw: string, field: string) {
  const match = raw.match(new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, "s"));
  return match ? decodeJsonString(match[1]).trim() : "";
}

function parseAiReview(raw: string, fallback: TradeAiReview): TradeAiReview {
  const candidate = extractBalancedJson(raw);
  try {
    const parsed = asObject(JSON.parse(candidate));
    return {
      diagnosis: asText(parsed.diagnosis, fallback.diagnosis),
      issueType: normalizeIssueType(parsed.issueType),
      suggestedEmotion: asText(parsed.suggestedEmotion, fallback.suggestedEmotion),
      suggestedMistake: asText(parsed.suggestedMistake, fallback.suggestedMistake),
      suggestedLesson: asText(parsed.suggestedLesson, fallback.suggestedLesson),
      nextRule: asText(parsed.nextRule, fallback.nextRule),
      notes: asText(parsed.notes, fallback.notes),
      confidence: normalizeConfidence(parsed.confidence),
      aiGenerated: true,
    };
  } catch {
    return {
      diagnosis: extractStringField(candidate, "diagnosis") || fallback.diagnosis,
      issueType: normalizeIssueType(extractStringField(candidate, "issueType")),
      suggestedEmotion: extractStringField(candidate, "suggestedEmotion") || fallback.suggestedEmotion,
      suggestedMistake: extractStringField(candidate, "suggestedMistake") || fallback.suggestedMistake,
      suggestedLesson: extractStringField(candidate, "suggestedLesson") || fallback.suggestedLesson,
      nextRule: extractStringField(candidate, "nextRule") || fallback.nextRule,
      notes: extractStringField(candidate, "notes") || fallback.notes,
      confidence: normalizeConfidence(extractStringField(candidate, "confidence")),
      aiGenerated: true,
    };
  }
}

async function safeBody(req: Request): Promise<TradeReviewRequest> {
  try {
    return asObject(await req.json()) as TradeReviewRequest;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await safeBody(req);
    const trade = asObject(body.trade);
    const draft = asObject(body.draft);
    const fallback = localReview(trade, draft);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey.startsWith("your_")) {
      return NextResponse.json(fallback);
    }

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
    } catch (error) {
      console.warn("Could not query Anthropic models for trade review:", error);
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

    const system = `You are ProfitPnL's trade review analyst. Analyze one trade and return ONLY compact valid JSON with no markdown. Required keys: diagnosis, issueType, suggestedEmotion, suggestedMistake, suggestedLesson, nextRule, notes, confidence. issueType must be one of Strategy, Execution, Risk, Psychology, Data Quality. confidence must be High, Medium, or Low. Be specific and practical. Never mention API, server, or missing implementation details.`;
    const prompt = `Trader: ${user.email || "unknown"}\nTrade JSON:\n${JSON.stringify(trade, null, 2).slice(0, 7000)}\n\nCurrent draft review JSON:\n${JSON.stringify(draft, null, 2).slice(0, 4000)}`;

    let raw = "";
    for (const model of modelsToTry) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 900,
          system,
          messages: [{ role: "user", content: prompt }],
        });
        raw = response.content.map((part) => part.type === "text" ? part.text : "").join(" ").trim();
        if (raw) break;
      } catch (error) {
        console.warn(`Trade review model ${model} failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    return NextResponse.json(raw ? parseAiReview(raw, fallback) : fallback);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("authorization") || message.includes("session") ? 401 : 200;
    return NextResponse.json(localReview(), { status });
  }
}
