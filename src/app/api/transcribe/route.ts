import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { toApiError } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-groq-api-key");
  if (!apiKey) {
    return Response.json({ error: "Missing API key" }, { status: 401 });
  }

  const formData = await request.formData();
  const audio = formData.get("audio") as File | null;
  const prompt = formData.get("prompt");
  if (!audio || audio.size === 0) {
    return Response.json({ error: "Missing audio" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      response_format: "json",
      ...(typeof prompt === "string" && prompt.trim() ? { prompt } : {}),
    });
    return Response.json({ text: transcription.text });
  } catch (err: unknown) {
    const { message, status } = toApiError(err, "Transcription failed");
    return Response.json({ error: message }, { status });
  }
}
