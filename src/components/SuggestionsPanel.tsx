"use client";

import ColumnHeader from "./ColumnHeader";
import { useAppStore } from "@/lib/store";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { TYPE_STYLES, TYPE_LABELS } from "@/lib/suggestionTypes";
import { sendSuggestion } from "@/lib/hooks/useChat";

export default function SuggestionsPanel() {
  const suggestionBatches = useAppStore((s) => s.suggestionBatches);
  const { loading, countdown, isRecording, handleReload } = useAutoRefresh();
  const batchCount = suggestionBatches.length;

  return (
    <div className="flex flex-col h-full">
      <ColumnHeader
        title="2. Live Suggestions"
        status={`${batchCount} ${batchCount === 1 ? "Batch" : "Batches"}`}
      />

      <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800 shrink-0">
        <button
          onClick={handleReload}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {loading ? "Fetching…" : "Reload suggestions"}
        </button>
        <span className="text-xs text-zinc-600">
          {isRecording ? `auto-refresh in ${countdown}s` : "auto-refresh in —"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {batchCount === 0 && !loading && (
          <p className="text-zinc-600 italic text-sm text-center pt-4">
            Suggestions will appear once recording starts…
          </p>
        )}

        {suggestionBatches.map((batch, batchIndex) => {
          // batchIndex 0 = newest; batchCount - batchIndex = batch number (oldest = 1)
          const batchNumber = batchCount - batchIndex;
          const isNewest = batchIndex === 0;

          return (
            <div key={batch.id}>
              {/* Suggestion cards */}
              <div className={`space-y-2 ${!isNewest ? "opacity-60" : ""}`}>
                {batch.suggestions.map((s, i) => {
                  const style = TYPE_STYLES[s.type];
                  return (
                    <div
                      key={i}
                      onClick={() => sendSuggestion(s)}
                      className={`rounded-lg border px-4 py-3 cursor-pointer hover:brightness-110 transition ${style.border} bg-zinc-900`}
                    >
                      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 mb-1.5 ${style.badge}`}>
                        {TYPE_LABELS[s.type]}
                      </span>
                      <p className="text-sm text-zinc-200 leading-snug">{s.preview}</p>
                    </div>
                  );
                })}
              </div>

              {/* Batch divider */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest whitespace-nowrap">
                  — Batch {batchNumber} · {batch.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })} —
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
