import { Anthropic } from '@anthropic-ai/sdk';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { createServerClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = 'nodejs';

/**
 * Streams the AI Coach's reply back as plain text chunks.
 * Now protected with authentication and plan verification.
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

    const { messages } = await req.json();

    // 3. Sanitize and Limit Messages
    const cleanMessages = (messages || [])
      .slice(-20) // Only last 20 messages to prevent context window abuse
      .map((m: { role: string; content: string }) => ({
        role: (m.role === 'model' || m.role === 'ai') ? 'assistant' as const : 'user' as const,
        content: m.content.slice(0, 4000), // Cap each message at 4000 chars
      }));

    if (!cleanMessages.length) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const anthropicStream = anthropic.messages.stream({
            model: 'claude-3-5-sonnet-20240620', // Updated to a specific stable model
            max_tokens: 1500,
            system: 'You are an Elite Trading Performance Coach. Your goal is to help the user identify behavioral patterns, emotional triggers, and technical leaks in their trading. Be direct, analytical, and encouraging, but hold them accountable.',
            messages: cleanMessages,
          });

          anthropicStream.on('text', (textDelta) => {
            controller.enqueue(encoder.encode(textDelta));
          });

          await anthropicStream.finalMessage();
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('Claude streaming error:', err);
          controller.enqueue(encoder.encode(`\n\n[System Error: Please try again later.]`));
          controller.close();
        }
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
