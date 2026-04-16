"use client";

import TranscriptPanel from "./TranscriptPanel";
import SuggestionsPanel from "./SuggestionsPanel";
import ChatPanel from "./ChatPanel";

export default function ClientApp() {
  return (
    <div className="flex h-screen bg-[#111113] text-zinc-100 overflow-hidden">
      <div className="w-1/3 border-r border-zinc-800 flex flex-col overflow-hidden">
        <TranscriptPanel />
      </div>
      <div className="w-1/3 border-r border-zinc-800 flex flex-col overflow-hidden">
        <SuggestionsPanel />
      </div>
      <div className="w-1/3 flex flex-col overflow-hidden">
        <ChatPanel />
      </div>
    </div>
  );
}
