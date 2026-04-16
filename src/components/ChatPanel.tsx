"use client";

import { useState } from "react";
import ColumnHeader from "./ColumnHeader";

export default function ChatPanel() {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-full">
      <ColumnHeader
        title="3. Chat (Detailed Answers)"
        status={
          <>
            <button className="hover:text-white transition-colors">Export</button>
            <button className="hover:text-white transition-colors">Settings</button>
            <span>Session-Only</span>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-zinc-600 italic text-sm">
          Click a suggestion or type a question to start…
        </p>
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) e.preventDefault(); }}
            placeholder="Ask anything…"
            className="flex-1 bg-zinc-800/60 text-zinc-100 text-sm rounded-lg px-4 py-2.5 outline-none placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
          />
          <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
