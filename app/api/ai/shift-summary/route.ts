import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { Anthropic } from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const { tradesCount, realizedPnl, postDiscipline, emotionsFelt, lessonsLearned, preNotes } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.startsWith("your_")) {
      return NextResponse.json({
        summary: `During this session, you operated with starting stress notes: "${preNotes || "None"}". You completed ${tradesCount} trades with a total realized P&L of $${realizedPnl}. You rated your discipline at ${postDiscipline}/10. (Configure ANTHROPIC_API_KEY to activate humanized Claude AI co-pilot summaries!)`
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are a warm, supportive, and analytical AI Trading Psychology Coach. 
You act like a real, deeply caring human co-pilot. Analyze the trader's session metrics and write a small, 
supportive, highly-insightful single-paragraph summary (under 4-5 sentences) directly addressing them.
Focus on their discipline, stress, sleep, lessons learned, and the emotional triggers of today's market. 
Do not use lists, bullet points, or complex formulas. Speak directly and personally. Use Markdown format.`;

    const userPrompt = `
Trader: ${user.email}
Shift Metrics:
- Completed Trades: ${tradesCount}
- Realized P&L: $${realizedPnl}
- Self-Discipline Rating: ${postDiscipline}/10
- Sleep / Stress pre-notes: "${preNotes || "None"}"
- Emotions Felt: "${emotionsFelt || "None"}"
- Lessons Learned: "${lessonsLearned || "None"}"
    `;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    });

    const summary = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ summary: summary.trim() });
  } catch (error: any) {
    console.error("AI Shift Generator error:", error);
    return NextResponse.json({ error: error?.message || "Could not generate AI summary" }, { status: 500 });
  }
}
