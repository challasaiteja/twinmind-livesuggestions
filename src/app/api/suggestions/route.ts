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
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content }],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    // Model may wrap array in an object e.g. {"suggestions":[...]}
    const parsed = JSON.parse(raw);
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions ?? parsed.items ?? Object.values(parsed)[0] ?? []);
    return Response.json({ suggestions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Suggestions failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
