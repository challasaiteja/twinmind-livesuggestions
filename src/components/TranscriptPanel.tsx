"use client";

import { useRef, useCallback } from "react";
import ColumnHeader from "./ColumnHeader";
import { useAppStore } from "@/lib/store";

export default function TranscriptPanel() {
  const { isRecording, setIsRecording, transcriptChunks, settings } = useAppStore();
  const recorderRef = useRef<MediaRecorder | null>(null);

  const sendChunk = useCallback(async (blob: Blob) => {
    const { settings: s, appendChunk } = useAppStore.getState();
    if (!s.groqApiKey || blob.size === 0) return;

    const fd = new FormData();
    fd.append("audio", new File([blob], "audio.webm", { type: blob.type }));
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "x-groq-api-key": s.groqApiKey },
        body: fd,
      });
      const data = await res.json();
      if (data.text?.trim()) appendChunk(data.text.trim());
    } catch {
      // network/transcription errors are non-fatal
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
      recorder.start(30_000); // fire dataavailable every 30s
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

  const chunkCount = transcriptChunks.length;

  return (
    <div className="flex flex-col h-full">
      <ColumnHeader
        title="1. Mic & Transcript"
        status={isRecording ? "Recording" : chunkCount > 0 ? `${chunkCount} chunks` : "Idle"}
      />

      <div className="flex flex-col items-center gap-3 pt-8 pb-6 shrink-0">
        <button
          onClick={toggleRecording}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors shadow-lg ${
            isRecording
              ? "bg-red-600 hover:bg-red-500 animate-pulse"
              : "bg-blue-600 hover:bg-blue-500"
          }`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-6.938 7A7.002 7.002 0 0 0 12 19a7.002 7.002 0 0 0 6.938-9H17a5 5 0 0 1-10 0H5.062zM11 20h2v2h-2v-2z" />
            </svg>
          )}
        </button>
        <span className="text-sm text-zinc-500">
          {isRecording ? "Recording… Click to stop." : "Stopped. Click to start."}
        </span>
        {!settings.groqApiKey && (
          <p className="text-xs text-amber-500/80 text-center px-6">
            Set your Groq API key in Settings to enable transcription.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
        {chunkCount === 0 ? (
          <p className="text-zinc-600 italic text-sm">
            Transcript will appear here once recording starts…
          </p>
        ) : (
          transcriptChunks.map((chunk) => (
            <div key={chunk.id} className="text-sm text-zinc-300 leading-relaxed">
              <span className="text-xs text-zinc-600 mr-2">
                {chunk.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              {chunk.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
