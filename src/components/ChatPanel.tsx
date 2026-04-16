"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ColumnHeader from "./ColumnHeader";
import { useAppStore } from "@/lib/store";
import { useChat } from "@/lib/hooks/useChat";
import { TYPE_LABELS, TYPE_STYLES } from "@/lib/suggestionTypes";

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const { isStreaming, sendQuestion } = useChat();
  const chatMessages = useAppStore((s) => s.chatMessages);
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
      <ColumnHeader
        title="3. Chat (Detailed Answers)"
        status={<span>Session-Only</span>}
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
