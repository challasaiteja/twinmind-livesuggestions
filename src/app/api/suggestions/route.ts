import Groq from "groq-sdk";
import { NextRequest } from "next/server";

const VALID_TYPES = new Set([
  "question",
  "talking_point",
  "answer",
  "fact_check",
  "context",
]);

function coerceList(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.suggestions)) return obj.suggestions;
    if (Array.isArray(obj.items)) return obj.items;
    const first = Object.values(obj)[0];
    if (Array.isArray(first)) return first;
  }
  return [];
}

function validate(raw: unknown): Array<{ type: string; preview: string }> {
  return coerceList(raw)
    .filter((s): s is { type: string; preview: string } => {
      if (!s || typeof s !== "object") return false;
      const t = (s as { type?: unknown }).type;
      const p = (s as { preview?: unknown }).preview;
      return (
        typeof t === "string" &&
        VALID_TYPES.has(t) &&
        typeof p === "string" &&
        p.trim().length > 0
      );
    })
    .map((s) => ({ type: s.type, preview: s.preview.trim() }))
    .slice(0, 3);
}

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
    const parsed = JSON.parse(raw);
    const suggestions = validate(parsed);
    if (suggestions.length === 0) {
      return Response.json(
        { error: "Model returned no valid suggestions" },
        { status: 502 }
      );
    }
    return Response.json({ suggestions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Suggestions failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
