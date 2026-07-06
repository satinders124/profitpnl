import { Anthropic } from '@anthropic-ai/sdk';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { createServerClient } from '@/lib/supabase-server';
import { buildTradingContext } from '@/lib/ai-context';

export const runtime = 'nodejs';

/**
 * Streams the AI Coach's reply back as plain text chunks.
 * Protected with authentication, plan verification, and robust error handling.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate User
    const user = await getAuthenticatedUser(req);
    
    // 2. Verify Pro Plan
    const supabase = createServerClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.plan !== "Pro Plan") {
      return new Response(JSON.stringify({ error: 'Pro Plan required to use AI Coach' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, systemPrompt: clientSystemPrompt, mode } = await req.json();

    // Query 100% live neural trading context directly on the backend server using service role bypass
    let liveSummary = "";
    try {
      const liveContext = await buildTradingContext(user.id, supabase);
      liveSummary = liveContext.summary;
    } catch (ctxErr) {
      console.error("Error building server trading context:", ctxErr);
    }

    // 3. Check if ANTHROPIC_API_KEY is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your_")) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const notice = `**⚠️ AI Coach Configuration Required:**\n\nThe server environment variable \`ANTHROPIC_API_KEY\` is missing or not yet configured.\n\nTo enable live AI coaching responses:\n1. Get your API key from the [Anthropic Console](https://console.anthropic.com).\n2. Add \`ANTHROPIC_API_KEY=sk-ant-...\` to your hosting dashboard (Vercel) or local \`.env.local\` file.\n3. Redeploy or restart your application.`;
          controller.enqueue(encoder.encode(notice));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    // 4. Sanitize and Normalize Messages (Anthropic requires strict alternating user/assistant roles starting with user)
    const rawMessages = (messages || [])
      .slice(-20)
      .map((m: { role: string; content: string }) => ({
        role: (m.role === 'model' || m.role === 'ai' || m.role === 'assistant') ? 'assistant' as const : 'user' as const,
        content: m.content ? m.content.slice(0, 4000) : '',
      }))
      .filter((m: { role: string; content: string }) => m.content.trim().length > 0);

    const cleanMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of rawMessages) {
      if (!cleanMessages.length) {
        if (msg.role === 'user') cleanMessages.push(msg);
      } else {
        const lastRole = cleanMessages[cleanMessages.length - 1].role;
        if (msg.role !== lastRole) {
          cleanMessages.push(msg);
        } else {
          // Merge consecutive messages with the same role
          cleanMessages[cleanMessages.length - 1].content += `\n\n${msg.content}`;
        }
      }
    }

    if (!cleanMessages.length) {
      return new Response(JSON.stringify({ error: 'No valid user messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const baseSystem = 'You are an Elite Trading Performance Coach embedded inside ProfitPnL, a trading journal app. Use Markdown formatting. Be direct, concise, analytical, and hold the trader accountable.';
    // For the live journal, prefer the server-built context (authoritative,
    // pulled straight from the DB). For the Backtesting journal the context is
    // assembled on the client (it already includes the user's backtested
    // trades), so prefer that instead and only fall back to live data.
    const contextToUse =
      mode === "backtest"
        ? clientSystemPrompt || liveSummary || ""
        : liveSummary || clientSystemPrompt || "";
    const finalSystem = contextToUse ? `${baseSystem}\n\n${contextToUse}` : baseSystem;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let success = false;
        let lastErrMessage = "Unknown error";

        // Dynamically query Anthropic /v1/models to see which exact model IDs are authorized on this API key
        let availableIds: string[] = [];
        try {
          const modelsRes = await fetch("https://api.anthropic.com/v1/models", {
            headers: {
              "x-api-key": process.env.ANTHROPIC_API_KEY || "",
              "anthropic-version": "2023-06-01",
            },
          });
          if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            if (Array.isArray(modelsData?.data)) {
              availableIds = modelsData.data.map((m: any) => m.id);
            }
          }
        } catch (e) {
          console.warn("Could not query /v1/models:", e);
        }

        // Prioritize:
        // 1. User specified environment override or user requested 'claude-sonnet-5'
        // 2. Models dynamically fetched from Anthropic /v1/models authorized for this exact API key
        // 3. Known fallback model identifiers
        const modelsToTry = Array.from(new Set([
          process.env.ANTHROPIC_MODEL,
          'claude-sonnet-5',
          ...availableIds.filter((id) => id.includes("sonnet")),
          ...availableIds,
          'claude-3-7-sonnet-20250219',
          'claude-3-7-sonnet-latest',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-latest',
          'claude-3-haiku-20240307',
        ].filter(Boolean))) as string[];

        for (const model of modelsToTry) {
          try {
            const anthropicStream = anthropic.messages.stream({
              model,
              max_tokens: 1500,
              system: finalSystem,
              messages: cleanMessages,
            });

            anthropicStream.on('text', (textDelta) => {
              controller.enqueue(encoder.encode(textDelta));
            });

            await anthropicStream.finalMessage();
            success = true;
            break;
          } catch (err: any) {
            lastErrMessage = err?.message || String(err);
            console.warn(`Model ${model} failed:`, lastErrMessage);
            // If model is not found (404), continue loop to next model fallback
            if (lastErrMessage.includes("404") || lastErrMessage.includes("not_found")) {
              continue;
            }
            break;
          }
        }

        if (!success) {
          const authorizedInfo = availableIds.length
            ? `Models authorized on your API key: ${availableIds.join(", ")}.`
            : `Could not retrieve authorized models list from /v1/models.`;
          controller.enqueue(encoder.encode(`\n\n[AI Coach Error: ${lastErrMessage}. ${authorizedInfo} Please check your ANTHROPIC_API_KEY credits/permissions.]`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Claude API Error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
