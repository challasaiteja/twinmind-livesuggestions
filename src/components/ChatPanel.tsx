"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ColumnHeader from "./ColumnHeader";
import { useAppStore } from "@/lib/store";
import { useChat } from "@/lib/hooks/useChat";
import { TYPE_LABELS, TYPE_STYLES } from "@/lib/suggestionTypes";
import { exportSession } from "@/lib/export";
import SettingsModal from "./SettingsModal";

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isStreaming, sendQuestion } = useChat();
  const chatMessages = useAppStore((s) => s.chatMessages);
  const transcriptCount = useAppStore((s) => s.transcriptChunks.length);
  const batchCount = useAppStore((s) => s.suggestionBatches.length);
  const canExport = transcriptCount > 0 || batchCount > 0 || chatMessages.length > 0;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput("");
    await sendQuestion(q);
  }, [input, isStreaming, sendQuestion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full">
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ColumnHeader
        title="3. Chat (Detailed Answers)"
        status={
          <>
            <button
              onClick={exportSession}
              disabled={!canExport}
              className="text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:hover:text-zinc-500"
              aria-label="Export session"
              title="Export session as JSON"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label="Open settings"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {chatMessages.length === 0 ? (
          <p className="text-zinc-600 italic text-sm">
            Click a suggestion or type a question to start…
          </p>
        ) : (
          chatMessages.map((msg) => {
            if (msg.role === "user") {
              const style = msg.suggestionType ? TYPE_STYLES[msg.suggestionType] : null;
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1">
                  {style && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 ${style.badge}`}>
                      {TYPE_LABELS[msg.suggestionType!]}
                    </span>
                  )}
                  <div className="max-w-[85%] bg-blue-600/20 border border-blue-500/30 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-100">
                    {msg.content}
                  </div>
                </div>
              );
            }

            const isLast = msg === chatMessages[chatMessages.length - 1];
            return (
              <div key={msg.id} className="flex flex-col items-start">
                <div className="max-w-[90%] bg-zinc-800/60 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {isStreaming && isLast && (
                    <span className="inline-block w-1.5 h-3.5 bg-zinc-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={isStreaming ? "Generating…" : "Ask anything…"}
            className="flex-1 bg-zinc-800/60 text-zinc-100 text-sm rounded-lg px-4 py-2.5 outline-none placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 transition disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
