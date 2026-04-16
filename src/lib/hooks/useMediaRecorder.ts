import { useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";

const CHUNK_MS = 30_000;
// How much trailing transcript to send as a Whisper prompt for continuity
const PROMPT_TAIL_CHARS = 200;

export function useMediaRecorder() {
  const setIsRecording = useAppStore((s) => s.setIsRecording);
  const isRecording = useAppStore((s) => s.isRecording);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppingRef = useRef(false);

  const sendChunk = useCallback(async (blob: Blob) => {
    const { settings, appendChunk, transcriptChunks } = useAppStore.getState();
    if (!settings.groqApiKey || blob.size === 0) return;

    const tail = transcriptChunks
      .map((c) => c.text)
      .join(" ")
      .slice(-PROMPT_TAIL_CHARS);

    const fd = new FormData();
    fd.append("audio", new File([blob], "audio.webm", { type: blob.type }));
    if (tail.trim()) fd.append("prompt", tail);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "x-groq-api-key": settings.groqApiKey },
        body: fd,
      });
      const data = await res.json();
      if (data.text?.trim()) appendChunk(data.text.trim());
    } catch {
      // non-fatal: transcription errors don't stop the recording session
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stoppingRef.current = false;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const makeRecorder = () => {
        const r = new MediaRecorder(stream, { mimeType });
        r.ondataavailable = (e) => {
          if (e.data.size > 0) sendChunk(e.data);
        };
        return r;
      };

      const rotate = () => {
        if (!streamRef.current || stoppingRef.current) return;
        const prev = recorderRef.current;
        const next = makeRecorder();
        recorderRef.current = next;
        next.start();
        // Stop the previous recorder after the next is running so no audio is dropped between rotations
        prev?.stop();
        rotateTimerRef.current = setTimeout(rotate, CHUNK_MS);
      };

      const first = makeRecorder();
      recorderRef.current = first;
      first.start();
      rotateTimerRef.current = setTimeout(rotate, CHUNK_MS);
      setIsRecording(true);
    } catch {
      alert("Microphone access was denied. Please allow mic access and try again.");
    }
  }, [sendChunk, setIsRecording]);

  const stopRecording = useCallback(() => {
    stoppingRef.current = true;
    if (rotateTimerRef.current) {
      clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  }, [setIsRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, toggleRecording };
}
