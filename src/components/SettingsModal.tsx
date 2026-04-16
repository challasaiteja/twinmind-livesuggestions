"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  DEFAULT_SUGGESTION_PROMPT,
  DEFAULT_DETAIL_PROMPT,
  DEFAULT_CHAT_PROMPT,
  DEFAULT_SUGGESTION_CONTEXT_CHARS,
  DEFAULT_CHAT_CONTEXT_CHARS,
} from "@/lib/prompts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [showKey, setShowKey] = useState(false);

  const resetPrompts = useCallback(() => {
    updateSettings({
      suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
      detailPrompt: DEFAULT_DETAIL_PROMPT,
      chatPrompt: DEFAULT_CHAT_PROMPT,
    });
  }, [updateSettings]);

  const resetContextSizes = useCallback(() => {
    updateSettings({
      suggestionContextChars: DEFAULT_SUGGESTION_CONTEXT_CHARS,
      chatContextChars: DEFAULT_CHAT_CONTEXT_CHARS,
    });
  }, [updateSettings]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-widest">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-8">
          {/* API Key */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Groq API Key</h3>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={settings.groqApiKey}
                onChange={(e) => updateSettings({ groqApiKey: e.target.value })}
                placeholder="gsk_…"
                className="flex-1 bg-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-2.5 outline-none placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 font-mono"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 text-xs rounded-lg transition-colors shrink-0"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
          </section>

          {/* Prompts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Prompts</h3>
              <button
                onClick={resetPrompts}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Reset to defaults
              </button>
            </div>

            <PromptField
              label="Suggestion Prompt"
              hint="Use {transcript}, {previous_suggestions} placeholders."
              value={settings.suggestionPrompt}
              onChange={(v) => updateSettings({ suggestionPrompt: v })}
            />
            <PromptField
              label="Detail Prompt"
              hint="Use {type}, {suggestion}, {transcript} placeholders."
              value={settings.detailPrompt}
              onChange={(v) => updateSettings({ detailPrompt: v })}
            />
            <PromptField
              label="Chat Prompt"
              hint="Use {transcript}, {chat_history}, {question} placeholders."
              value={settings.chatPrompt}
              onChange={(v) => updateSettings({ chatPrompt: v })}
            />
          </section>

          {/* Context Windows */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Context Window</h3>
              <button
                onClick={resetContextSizes}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Reset to defaults
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ContextSizeField
                label="Suggestion Context"
                hint={`Default: ${DEFAULT_SUGGESTION_CONTEXT_CHARS.toLocaleString()} chars`}
                value={settings.suggestionContextChars}
                onChange={(v) => updateSettings({ suggestionContextChars: v })}
              />
              <ContextSizeField
                label="Chat Context"
                hint={`Default: ${DEFAULT_CHAT_CONTEXT_CHARS.toLocaleString()} chars`}
                value={settings.chatContextChars}
                onChange={(v) => updateSettings({ chatContextChars: v })}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PromptField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-zinc-400">{label}</label>
      <p className="text-[10px] text-zinc-600">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full bg-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2.5 outline-none placeholder-zinc-600 focus:ring-1 focus:ring-zinc-600 resize-y font-mono leading-relaxed"
      />
    </div>
  );
}

function ContextSizeField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-zinc-400">{label}</label>
      <p className="text-[10px] text-zinc-600">{hint}</p>
      <input
        type="number"
        min={500}
        max={100000}
        step={500}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n) && n >= 500) onChange(n);
        }}
        className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-zinc-600"
      />
    </div>
  );
}
