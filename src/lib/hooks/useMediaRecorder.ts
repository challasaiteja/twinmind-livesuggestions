import { useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";

export function useMediaRecorder() {
  const setIsRecording = useAppStore((s) => s.setIsRecording);
  const isRecording = useAppStore((s) => s.isRecording);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const sendChunk = useCallback(async (blob: Blob) => {
    const { settings, appendChunk } = useAppStore.getState();
    if (!settings.groqApiKey || blob.size === 0) return;

    const fd = new FormData();
    fd.append("audio", new File([blob], "audio.webm", { type: blob.type }));
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
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) sendChunk(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start(30_000);
      setIsRecording(true);
    } catch {
      alert("Microphone access was denied. Please allow mic access and try again.");
    }
  }, [sendChunk, setIsRecording]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, [setIsRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, toggleRecording };
}
