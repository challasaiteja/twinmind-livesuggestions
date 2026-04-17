import { useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import type { Suggestion } from "@/lib/store";

const CHAT_HISTORY_TURNS = 6;
const CHAT_HISTORY_CHARS = 2000;

async function streamToStore(content: string) {
  const { settings, isStreaming, setIsStreaming, addAssistantMessage, appendToLastAssistantMessage } =
    useAppStore.getState();

  if (!settings.groqApiKey) return;
  // Prevent concurrent streams
  if (isStreaming) return;

  setIsStreaming(true);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-groq-api-key": settings.groqApiKey },
      body: JSON.stringify({ content }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: `Chat failed (${res.status})` }));
      toast.error(err.error ?? "Chat request failed");
      return;
    }

    // Only mount the assistant bubble once we know bytes are coming
    addAssistantMessage("");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      appendToLastAssistantMessage(decoder.decode(value, { stream: true }));
    }
  } catch {
    toast.error("Failed to reach the server.");
  } finally {
    setIsStreaming(false);
  }
}

// Standalone — can be called from SuggestionsPanel without a hook instance
export async function sendSuggestion(suggestion: Suggestion) {
  const { settings, getTranscriptText, addUserMessage } = useAppStore.getState();
  if (!settings.groqApiKey) return;

  const transcript = getTranscriptText(settings.chatContextChars);
  const filled = settings.detailPrompt
    .replace("{type}", suggestion.type)
    .replace("{suggestion}", suggestion.preview)
    .replace("{transcript}", transcript);

  addUserMessage(suggestion.preview, suggestion.type);
  await streamToStore(filled);
}

export function useChat() {
  const isStreaming = useAppStore((s) => s.isStreaming);

  const sendQuestion = useCallback(async (question: string) => {
    const { settings, getTranscriptText, addUserMessage, chatMessages } = useAppStore.getState();
    if (!question.trim() || !settings.groqApiKey) return;

    const transcript = getTranscriptText(settings.chatContextChars);

    // Format the last few turns as chat history so the model can resolve follow-ups
    const priorHistory = chatMessages
      .slice(-CHAT_HISTORY_TURNS)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    const trimmed =
      priorHistory.length > CHAT_HISTORY_CHARS ? priorHistory.slice(-CHAT_HISTORY_CHARS) : priorHistory;
    const chatHistory = trimmed.trim() || "(no prior messages)";

    const filled = settings.chatPrompt
      .replaceAll("{transcript}", transcript)
      .replaceAll("{chat_history}", chatHistory)
      .replaceAll("{question}", question);

    addUserMessage(question);
    await streamToStore(filled);
  }, []);

  return { isStreaming, sendQuestion };
}
