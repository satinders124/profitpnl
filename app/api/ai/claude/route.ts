import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = 'nodejs';

/**
 * Streams the AI Coach's reply back as plain text chunks (Server-Sent
 * "raw stream" over a ReadableStream, not JSON) so the client can render
 * tokens as they arrive — the same feel as ChatGPT/Claude's own UI,
 * instead of waiting for the full response and pasting it in at once.
 */
export async function POST(req: Request) {
  try {
    const { messages, systemPrompt } = await req.json();

    const cleanMessages = (messages || []).map((m: { role: string; content: string }) => ({
      role: (m.role === 'model' || m.role === 'ai') ? 'assistant' as const : 'user' as const,
      content: m.content,
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
            model: 'claude-sonnet-5',
            max_tokens: 1500,
            system: systemPrompt || 'You are an Elite Trading Performance Coach.',
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
          // Surface the error as visible text in the stream itself, since
          // headers/status are already committed once streaming starts.
          controller.enqueue(encoder.encode(`\n\n[System Error: ${message}]`));
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
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
