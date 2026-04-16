import Groq from "groq-sdk";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-groq-api-key");
  if (!apiKey) {
    return Response.json({ error: "Missing API key" }, { status: 401 });
  }

  const { transcript, prompt } = await request.json();
  if (!transcript?.trim()) {
    return Response.json({ error: "No transcript" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });
    const filled = (prompt as string).replace("{transcript}", transcript);

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: filled }],
      temperature: 0.7,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const suggestions = JSON.parse(raw);
    return Response.json({ suggestions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Suggestions failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
