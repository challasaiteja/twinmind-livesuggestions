import Groq from "groq-sdk";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-groq-api-key");
  if (!apiKey) {
    return Response.json({ error: "Missing API key" }, { status: 401 });
  }

  const { content } = await request.json();
  if (!content?.trim()) {
    return Response.json({ error: "Missing content" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content }],
      stream: true,
      max_tokens: 1500,
    });

    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
