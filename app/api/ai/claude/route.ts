import { Anthropic } from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt } = await req.json();

    const cleanMessages = messages.map((m: any) => ({
      role: (m.role === 'model' || m.role === 'ai') ? 'assistant' : 'user',
      content: m.content,
    }));

    if (!cleanMessages || cleanMessages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5', // Updated to the model you requested
      max_tokens: 1500,
      system: systemPrompt || "You are an Elite Trading Performance Coach.",
      messages: cleanMessages,
    });

    // Robust response extraction
    const textBlock = response.content.find(block => block.type === 'text');
    const finalText = textBlock ? textBlock.text : "I processed your request but couldn't format the text response. Please try again.";

    return NextResponse.json({ text: finalText });

  } catch (error: any) {
    console.error('Claude API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}