import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { Anthropic } from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { tradesCount, realizedPnl, postDiscipline, emotionsFelt, lessonsLearned, preNotes, shiftId } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Fetch actual session trades and notes for a real AI analysis
    let sessionTrades: any[] = [];
    let actualShiftId = shiftId;
    const supabase = createServerClient();

    try {
      // Find the most recent active/recent shift if shiftId not provided
      if (!actualShiftId) {
        const { data: latestShift } = await supabase
          .from("trader_shifts")
          .select("id, clock_in, clock_out")
          .eq("user_id", user.id)
          .order("clock_in", { ascending: false })
          .limit(1)
          .single();
        if (latestShift) actualShiftId = latestShift.id;
      }

      if (actualShiftId) {
        const { data: trades } = await supabase
          .from("running_trades")
          .select("*")
          .eq("shift_id", actualShiftId)
          .order("created_at", { ascending: false });
        sessionTrades = trades || [];
      }
    } catch (dbErr) {
      console.error("DB query error in shift-summary:", dbErr);
    }

    // Build trade details string
    const tradeDetails = sessionTrades.map((t: any) => {
      const rules = Array.isArray(t.rules_followed) ? t.rules_followed.join(", ") : "None";
      return `- ${t.strategy_name || "Manual"}: Entry $${t.entry_price}, SL $${t.sl_price}, TP $${t.tp_price}, Lot ${t.lot_size}, Risk $${t.risk_amount}, Status: ${t.status}, Realized P&L: $${t.pnl_realized ?? 0}, Rules: ${rules}`;
    }).join("\n");

    // Calculate session duration from DB if available
    let sessionDurationText = "";
    if (actualShiftId) {
      const { data: shiftRow } = await supabase
        .from("trader_shifts")
        .select("clock_in, clock_out, session_duration_minutes")
        .eq("id", actualShiftId)
        .single();
      if (shiftRow) {
        if (shiftRow.session_duration_minutes) {
          const hrs = Math.floor(shiftRow.session_duration_minutes / 60);
          const mins = shiftRow.session_duration_minutes % 60;
          sessionDurationText = `Session Duration: ${hrs}h ${mins}m.`;
        } else if (shiftRow.clock_in && shiftRow.clock_out) {
          const durationMs = new Date(shiftRow.clock_out).getTime() - new Date(shiftRow.clock_in).getTime();
          const durationMins = Math.round(durationMs / 60000);
          sessionDurationText = `Session Duration: ${Math.round(durationMins / 60)}h ${durationMins % 60}m.`;
        }
      }
    }

    const systemPrompt = `You are a warm, supportive, and analytical AI Trading Psychology Coach embedded inside ProfitPnL.
You act like a real, deeply caring human co-pilot. Analyze the trader's full session — including each trade entry/exit, rules followed, emotional notes, and lessons — and write a rich, insightful, single-paragraph summary (under 6-8 sentences) directly addressing them.
Reference specific trades by name or setup. Mention if rules were followed. Speak personally. Use Markdown formatting. Be direct, analytical, and encouraging — not generic.`;

    const userPrompt = `
Trader Email: ${user.email}
${sessionDurationText ? sessionDurationText + "\n" : ""}
Shift Metrics:
- Completed / Closed Trades: ${sessionTrades.filter((t: any) => t.status === "closed").length} / ${sessionTrades.length}
- Realized P&L (from closed trades): $${sessionTrades.filter((t: any) => t.status === "closed").reduce((sum: number, t: any) => sum + (t.pnl_realized || 0), 0)}
- User-Reported Realized P&L: $${realizedPnl}
- Self-Discipline Rating: ${postDiscipline}/10
- Sleep / Stress pre-notes: "${preNotes || "None"}"
- Emotions Felt: "${emotionsFelt || "None"}"
- Lessons Learned: "${lessonsLearned || "None"}"

Actual Trade Telemetry from this session:
${tradeDetails || "No individual trade telemetry recorded."}
`;

    // If no API key configured, return a structured fallback
    if (!apiKey || apiKey.startsWith("your_")) {
      return NextResponse.json({
        summary: `AI Risk-Guard Analysis (API not configured): During this session (${sessionDurationText || "unknown duration"}), you executed ${sessionTrades.length} tracked positions (${sessionTrades.filter((t: any) => t.status === "closed").length} closed) with $${realizedPnl} reported P&L. Your discipline rating was ${postDiscipline}/10. Pre-session notes: "${preNotes || "None"}". Emotions: "${emotionsFelt || "None"}". Key lesson: "${lessonsLearned || "None"}". Trade details: ${tradeDetails || "None"}. (Configure ANTHROPIC_API_KEY for full Claude AI co-pilot reports.)`
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Try the same model priority as the AI Chat Bot (claude-3-5-sonnet-latest first, then fallbacks)
    const modelsToTry = [
      "claude-3-5-sonnet-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307",
    ];

    let summary = "";
    let lastErr = "";

    for (const model of modelsToTry) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 800,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }]
        });
        summary = response.content[0].type === "text" ? response.content[0].text : "";
        break;
      } catch (err: any) {
        lastErr = err?.message || String(err);
        console.warn(`Shift-summary model ${model} failed:`, lastErr);
      }
    }

    if (!summary) {
      summary = `AI Shift Analysis: ${user.email} completed a session (${sessionDurationText}). ${sessionTrades.length} trades tracked (${sessionTrades.filter((t: any) => t.status === "closed").length} closed). Reported P&L $${realizedPnl}. Discipline: ${postDiscipline}/10. Pre-notes: "${preNotes || "None"}". Emotions: "${emotionsFelt || "None"}". Lesson: "${lessonsLearned || "None"}".`;
      if (lastErr) summary += ` [Note: Claude API error — ${lastErr}]`;
    }

    return NextResponse.json({ summary: summary.trim() });
  } catch (error: any) {
    console.error("AI Shift Generator error:", error);
    return NextResponse.json({ error: error?.message || "Could not generate AI summary" }, { status: 500 });
  }
}
