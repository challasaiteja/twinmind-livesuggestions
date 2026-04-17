"use client";

import { useEffect, useRef } from "react";
import ColumnHeader from "./ColumnHeader";
import { useAppStore } from "@/lib/store";
import { useMediaRecorder } from "@/lib/hooks/useMediaRecorder";

export default function TranscriptPanel() {
  const { isRecording, toggleRecording } = useMediaRecorder();
  const transcriptChunks = useAppStore((s) => s.transcriptChunks);
  const hasApiKey = useAppStore((s) => !!s.settings.groqApiKey);
  const transcriptionError = useAppStore((s) => s.transcriptionError);
  const setTranscriptionError = useAppStore((s) => s.setTranscriptionError);
  const chunkCount = transcriptChunks.length;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunkCount]);

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
        {!hasApiKey && (
          <p className="text-xs text-amber-500/80 text-center px-6">
            Set your Groq API key in Settings to enable transcription.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
        {transcriptionError && (
          <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2">
            <span className="flex-1">
              <span className="font-semibold">Transcription issue:</span> {transcriptionError}
            </span>
            <button
              onClick={() => setTranscriptionError(null)}
              className="text-amber-400 hover:text-amber-200 shrink-0 leading-none text-base"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
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
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
