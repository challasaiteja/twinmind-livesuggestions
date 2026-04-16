import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { Suggestion } from "@/lib/store";

async function streamToStore(content: string) {
  const { settings, addAssistantMessage, appendToLastAssistantMessage } = useAppStore.getState();
  if (!settings.groqApiKey) return;

  addAssistantMessage("");
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-groq-api-key": settings.groqApiKey },
      body: JSON.stringify({ content }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      appendToLastAssistantMessage(`_Error: ${err.error}_`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      appendToLastAssistantMessage(decoder.decode(value, { stream: true }));
    }
  } catch {
    appendToLastAssistantMessage("_Error: failed to reach the server._");
  }
}

// Standalone — can be imported and called from SuggestionsPanel without a hook instance
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
  const [isStreaming, setIsStreaming] = useState(false);

  const sendQuestion = useCallback(async (question: string) => {
    const { settings, getTranscriptText, addUserMessage } = useAppStore.getState();
    if (!question.trim() || !settings.groqApiKey) return;

    const transcript = getTranscriptText(settings.chatContextChars);
    const filled = settings.chatPrompt
      .replace("{transcript}", transcript)
      .replace("{question}", question);

    addUserMessage(question);
    setIsStreaming(true);
    await streamToStore(filled);
    setIsStreaming(false);
  }, []);

  return { isStreaming, sendQuestion };
}
