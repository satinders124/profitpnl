import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { getAuthenticatedUser } from "@/lib/auth-utils";

export const runtime = "nodejs";

type InsightPayload = {
  kind?: string;
  context?: unknown;
};

type AiInsight = {
  title: string;
  summary: string;
  bullets: string[];
  action: string;
  aiGenerated: boolean;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).slice(0, 6) : [];
}

function fallbackTitle(kind: string) {
  const titles: Record<string, string> = {
    "daily-plan": "Pre-market AI risk brief",
    "weekly-review": "Weekly performance diagnosis",
    "leak-finder": "Primary leak diagnosis",
    "trade-review": "Execution review diagnosis",
    "prop-firm": "Prop firm risk verdict",
    "mentor": "Mentor briefing packet",
    "import": "Import quality check",
  };
  return titles[kind] || "ProfitPnL AI insight";
}

function localInsight(kind: string): AiInsight {
  const base: Record<string, Omit<AiInsight, "aiGenerated">> = {
    "daily-plan": {
      title: "Pre-market AI risk brief",
      summary: "Use this plan as your trading permission slip. The goal is not to find more trades — it is to protect decision quality, cap downside, and only engage the setups your recent data supports.",
      bullets: ["Trade only the allowed setup list.", "Keep risk fixed for the whole session.", "Stop after the first emotional rule break."],
      action: "Accept the plan before entering the market, then compare execution against it after the session.",
    },
    "weekly-review": {
      title: "Weekly performance diagnosis",
      summary: "Your weekly review should separate edge from behavior. Protect the setup that produced clean R, remove the largest leak, and complete missing reviews before increasing size.",
      bullets: ["Review the biggest losing cluster first.", "Use next week rules as hard constraints.", "Do not add risk until review completion improves."],
      action: "Copy the weekly rules and place them inside tomorrow's Daily Plan.",
    },
    "leak-finder": {
      title: "Primary leak diagnosis",
      summary: "The leak board ranks what is costing the most R. Your job is to turn the top leak into one hard rule that prevents repeat damage next session.",
      bullets: ["Start with the highest R-cost leak.", "Reduce or pause that condition temporarily.", "Track whether the leak improves over the next 7 trading days."],
      action: "Write one if/then rule for the top leak and follow it for the next week.",
    },
    "trade-review": {
      title: "Execution review diagnosis",
      summary: "A single trade review should answer whether the result came from the strategy, execution, risk, or psychology. Save one lesson that can change the next decision.",
      bullets: ["Classify the mistake honestly.", "Save a specific lesson, not a generic note.", "Tie the trade back to a playbook rule."],
      action: "Save the review only after emotion, mistake, and lesson are filled.",
    },
    "prop-firm": {
      title: "Prop firm risk verdict",
      summary: "Challenge safety depends on buffers, not confidence. If daily or max drawdown buffer is tight, the correct move is smaller size or no trade — not recovery trading.",
      bullets: ["Respect the daily loss buffer first.", "Avoid oversized winning days that can create consistency risk.", "Reduce size when drawdown buffer is compressed."],
      action: "Set max risk per trade from the available buffer before entering a position.",
    },
    "mentor": {
      title: "Mentor briefing packet",
      summary: "A mentor can help fastest when the journal is clean. Prioritize incomplete trade reviews, weak setups, and repeated psychology tags before asking for strategy changes.",
      bullets: ["Send the mentor packet before the call.", "Ask for feedback on the weakest setup.", "Resolve missing reviews first."],
      action: "Copy the mentor packet and share it with your coach or accountability partner.",
    },
    "import": {
      title: "Import quality check",
      summary: "Imported data is only useful if the key fields are mapped correctly. Confirm date, instrument, direction, P&L, and setup before committing the import.",
      bullets: ["Check required mappings before import.", "Preview duplicates and missing fields.", "Clean broker-specific symbols after import if needed."],
      action: "Import a small sample first, verify analytics, then import the full file.",
    },
  };

  const fallback = base[kind] || {
    title: fallbackTitle(kind),
    summary: "ProfitPnL has enough structure here to generate a coaching insight. Use the current metrics to create one specific rule before taking action.",
    bullets: ["Review the key metric.", "Turn the weakness into a rule.", "Track the rule next session."],
    action: "Convert this insight into a specific trading rule.",
  };

  return { ...fallback, aiGenerated: false };
}

function stripMarkdownFences(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
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

  // If the AI response is cut off mid-object, return the cleaned raw text so the
  // regex extractor below can still recover title/summary/bullets without
  // exposing JSON syntax to the user.
  return cleaned;
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
}

function extractStringField(raw: string, field: "title" | "summary" | "action") {
  const match = raw.match(new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)`, "s"));
  return match ? decodeJsonString(match[1]).trim() : "";
}

function extractBulletFields(raw: string) {
  const arrayMatch = raw.match(/"bullets"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (!arrayMatch) return [];
  return Array.from(arrayMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g))
    .map((match) => decodeJsonString(match[1]).trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parseJsonInsight(raw: string, kind: string): AiInsight {
  const fallback = localInsight(kind);
  const candidate = extractBalancedJson(raw);

  try {
    const parsed = asObject(JSON.parse(candidate));
    const bullets = stringArray(parsed.bullets);
    return {
      title: text(parsed.title, fallback.title).slice(0, 90),
      summary: text(parsed.summary, fallback.summary),
      bullets: bullets.length ? bullets : fallback.bullets,
      action: text(parsed.action, fallback.action),
      aiGenerated: true,
    };
  } catch {
    const title = extractStringField(candidate, "title") || fallback.title;
    const summary = extractStringField(candidate, "summary") || fallback.summary;
    const bullets = extractBulletFields(candidate);
    const action = extractStringField(candidate, "action") || fallback.action;

    return {
      title: title.slice(0, 90),
      summary,
      bullets: bullets.length ? bullets : fallback.bullets,
      action,
      aiGenerated: Boolean(title || summary || bullets.length || action),
    };
  }
}

async function safeBody(req: Request): Promise<InsightPayload> {
  try {
    const body = await req.json();
    return asObject(body) as InsightPayload;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await safeBody(req);
    const kind = text(body.kind, "general");
    const context = JSON.stringify(body.context || {}, null, 2).slice(0, 12000);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey.startsWith("your_")) {
      return NextResponse.json(localInsight(kind));
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
      console.warn("Could not query Anthropic models for page insight:", error);
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

    const system = `You are ProfitPnL's institutional trading performance analyst. You write concise, premium coaching insights for a trading journal product. Never mention APIs, environment variables, servers, or implementation details. Return ONLY compact valid JSON with no markdown fences and no prose outside JSON. Required keys: title (short), summary (60-110 words), bullets (exactly 3 short strings), action (one concrete next step). Be specific, direct, and risk-aware.`;
    const prompt = `Trader: ${user.email || "unknown"}\nPage kind: ${kind}\nContext JSON:\n${context}`;

    let raw = "";
    for (const model of modelsToTry) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 1000,
          system,
          messages: [{ role: "user", content: prompt }],
        });
        raw = response.content.map((part) => part.type === "text" ? part.text : "").join(" ").trim();
        if (raw) break;
      } catch (error) {
        console.warn(`Page insight model ${model} failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    return NextResponse.json(raw ? parseJsonInsight(raw, kind) : localInsight(kind));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("authorization") || message.includes("session") ? 401 : 200;
    return NextResponse.json(localInsight("general"), { status });
  }
}
