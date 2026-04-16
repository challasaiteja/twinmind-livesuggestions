"use client";

import ColumnHeader from "./ColumnHeader";

export default function SuggestionsPanel() {
  return (
    <div className="flex flex-col h-full">
      <ColumnHeader title="2. Live Suggestions" status="0 Batches" />

      <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800 shrink-0">
        <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reload suggestions
        </button>
        <span className="text-xs text-zinc-600">auto-refresh in —</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-zinc-600 italic text-sm text-center pt-4">
          Suggestions will appear once recording starts…
        </p>
      </div>
    </div>
  );
}
