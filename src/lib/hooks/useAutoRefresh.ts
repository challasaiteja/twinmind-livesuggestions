import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";

const AUTO_REFRESH_SEC = 30;

async function fetchSuggestions(apiKey: string, transcript: string, prompt: string) {
  const res = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-groq-api-key": apiKey },
    body: JSON.stringify({ transcript, prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data.suggestions;
}

export function useAutoRefresh() {
  const isRecording = useAppStore((s) => s.isRecording);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SEC);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const { settings, getTranscriptText, addBatch } = useAppStore.getState();
    const transcript = getTranscriptText(settings.suggestionContextChars);
    if (!settings.groqApiKey || !transcript.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const suggestions = await fetchSuggestions(settings.groqApiKey, transcript, settings.suggestionPrompt);
      if (suggestions?.length) addBatch(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetCountdown = useCallback(() => {
    setCountdown(AUTO_REFRESH_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((n) => (n <= 1 ? AUTO_REFRESH_SEC : n - 1));
    }, 1000);
  }, []);

  useEffect(() => {
    if (isRecording) {
      refresh();
      resetCountdown();
      intervalRef.current = setInterval(() => {
        refresh();
        resetCountdown();
      }, AUTO_REFRESH_SEC * 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(AUTO_REFRESH_SEC);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isRecording, refresh, resetCountdown]);

  const handleReload = useCallback(() => {
    refresh();
    if (isRecording) resetCountdown();
  }, [refresh, isRecording, resetCountdown]);

  return { loading, error, countdown, isRecording, handleReload };
}
