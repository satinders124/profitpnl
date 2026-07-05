import { Anthropic } from '@anthropic-ai/sdk';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { createServerClient } from '@/lib/supabase-server';

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

    const { messages, systemPrompt } = await req.json();

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

    const finalSystem = systemPrompt || 'You are an Elite Trading Performance Coach. Your goal is to help the user identify behavioral patterns, emotional triggers, and technical leaks in their trading. Be direct, analytical, and encouraging, but hold them accountable.';

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let success = false;
        let lastErrMessage = "Unknown error";

        // Try stable Claude 3.5 Sonnet releases with automatic fallback to Haiku if model tier is restricted
        const modelsToTry = Array.from(new Set([
          process.env.ANTHROPIC_MODEL,
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
            // If model is not found (404), fallback to next model in list
            if (lastErrMessage.includes("404") || lastErrMessage.includes("not_found")) {
              continue;
            }
            break;
          }
        }

        if (!success) {
          controller.enqueue(encoder.encode(`\n\n[AI Coach Error: ${lastErrMessage}. Tried models: ${modelsToTry.join(", ")}. Please verify your ANTHROPIC_API_KEY and credits.]`));
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
