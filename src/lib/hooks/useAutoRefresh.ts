import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore } from "@/lib/store";

const AUTO_REFRESH_SEC = 30;
// Wait for the last transcription chunk to land before final refresh
const STOP_DELAY_MS = 2500;

// How many recent batches to surface as "previously shown" suggestions
const PREVIOUS_BATCHES = 3;

async function fetchSuggestions(apiKey: string, content: string) {
  const res = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-groq-api-key": apiKey },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data.suggestions;
}

export function useAutoRefresh() {
  const isRecording = useAppStore((s) => s.isRecording);
  const chunkCount = useAppStore((s) => s.transcriptChunks.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SEC);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasRecordingRef = useRef(false);
  const firstChunkFiredRef = useRef(false);
  const chunkCountAtStartRef = useRef(0);
  // Prevent overlapping refreshes (auto-tick colliding with a manual reload, etc.)
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    const { settings, getTranscriptText, addBatch, suggestionBatches } = useAppStore.getState();
    const transcript = getTranscriptText(settings.suggestionContextChars);
    if (!settings.groqApiKey || !transcript.trim()) return;

    const previousList = suggestionBatches
      .slice(0, PREVIOUS_BATCHES)
      .flatMap((b) => b.suggestions)
      .map((s) => `- [${s.type}] ${s.preview}`)
      .join("\n");
    const previousSuggestions = previousList.trim() || "(none yet)";

    const content = settings.suggestionPrompt
      .replaceAll("{transcript}", transcript)
      .replaceAll("{previous_suggestions}", previousSuggestions);

    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const suggestions = await fetchSuggestions(settings.groqApiKey, content);
      if (suggestions?.length) addBatch(suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      inFlightRef.current = false;
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

  // Start/stop the 30s auto-refresh cycle
  useEffect(() => {
    if (isRecording) {
      wasRecordingRef.current = true;
      firstChunkFiredRef.current = false;
      chunkCountAtStartRef.current = useAppStore.getState().transcriptChunks.length;
      // Don't call refresh() immediately — wait for a NEW chunk to arrive (see below)
      resetCountdown();
      intervalRef.current = setInterval(() => {
        refresh();
        resetCountdown();
      }, AUTO_REFRESH_SEC * 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(AUTO_REFRESH_SEC);

      // Trigger a final refresh when recording stops, giving the last chunk time to land
      if (wasRecordingRef.current) {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        stopTimerRef.current = setTimeout(refresh, STOP_DELAY_MS);
      }
      wasRecordingRef.current = false;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, [isRecording, refresh, resetCountdown]);

  // Fire as soon as the first NEW transcript chunk arrives during this recording session.
  // Comparing against chunkCountAtStart avoids refiring when starting a new session
  // on top of an existing transcript.
  useEffect(() => {
    if (
      isRecording &&
      chunkCount > chunkCountAtStartRef.current &&
      !firstChunkFiredRef.current
    ) {
      firstChunkFiredRef.current = true;
      refresh();
      resetCountdown();
    }
  }, [isRecording, chunkCount, refresh, resetCountdown]);

  const handleReload = useCallback(() => {
    refresh();
    if (isRecording) resetCountdown();
  }, [refresh, isRecording, resetCountdown]);

  return { loading, error, countdown, isRecording, handleReload };
}
