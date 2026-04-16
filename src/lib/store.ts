import { create } from "zustand";
import {
  DEFAULT_SUGGESTION_PROMPT,
  DEFAULT_DETAIL_PROMPT,
  DEFAULT_CHAT_PROMPT,
  DEFAULT_SUGGESTION_CONTEXT_CHARS,
  DEFAULT_CHAT_CONTEXT_CHARS,
} from "./prompts";

// ── Types ────────────────────────────────────────────────────────────────────

export type SuggestionType = "question" | "talking_point" | "answer" | "fact_check" | "context";

export interface Suggestion {
  type: SuggestionType;
  preview: string;
}

export interface SuggestionBatch {
  id: string;
  timestamp: Date;
  suggestions: Suggestion[];
}

export interface TranscriptChunk {
  id: string;
  timestamp: Date;
  text: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  /** Set when this message was triggered by clicking a suggestion */
  suggestionType?: SuggestionType;
}

export interface Settings {
  groqApiKey: string;
  suggestionPrompt: string;
  detailPrompt: string;
  chatPrompt: string;
  suggestionContextChars: number;
  chatContextChars: number;
}

// ── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  // Recording
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;

  // Transcript
  transcriptChunks: TranscriptChunk[];
  appendChunk: (text: string) => void;
  clearTranscript: () => void;

  // Suggestions
  suggestionBatches: SuggestionBatch[];
  addBatch: (suggestions: Suggestion[]) => void;
  clearSuggestions: () => void;

  // Chat
  chatMessages: ChatMessage[];
  addUserMessage: (content: string, suggestionType?: SuggestionType) => void;
  addAssistantMessage: (content: string) => void;
  appendToLastAssistantMessage: (delta: string) => void;
  clearChat: () => void;

  // Settings
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;

  // Derived helpers
  getTranscriptText: (maxChars?: number) => string;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Recording ──────────────────────────────────────────────────────────────
  isRecording: false,
  setIsRecording: (v) => set({ isRecording: v }),

  // ── Transcript ─────────────────────────────────────────────────────────────
  transcriptChunks: [],
  appendChunk: (text) =>
    set((s) => ({
      transcriptChunks: [
        ...s.transcriptChunks,
        { id: crypto.randomUUID(), timestamp: new Date(), text },
      ],
    })),
  clearTranscript: () => set({ transcriptChunks: [] }),

  // ── Suggestions ────────────────────────────────────────────────────────────
  suggestionBatches: [],
  addBatch: (suggestions) =>
    set((s) => ({
      suggestionBatches: [
        { id: crypto.randomUUID(), timestamp: new Date(), suggestions },
        ...s.suggestionBatches,
      ],
    })),
  clearSuggestions: () => set({ suggestionBatches: [] }),

  // ── Chat ───────────────────────────────────────────────────────────────────
  chatMessages: [],
  addUserMessage: (content, suggestionType) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { id: crypto.randomUUID(), role: "user", content, timestamp: new Date(), suggestionType },
      ],
    })),
  addAssistantMessage: (content) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date() },
      ],
    })),
  appendToLastAssistantMessage: (delta) =>
    set((s) => {
      const msgs = [...s.chatMessages];
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== "assistant") return s;
      msgs[msgs.length - 1] = { ...last, content: last.content + delta };
      return { chatMessages: msgs };
    }),
  clearChat: () => set({ chatMessages: [] }),

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    groqApiKey: "",
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    detailPrompt: DEFAULT_DETAIL_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    suggestionContextChars: DEFAULT_SUGGESTION_CONTEXT_CHARS,
    chatContextChars: DEFAULT_CHAT_CONTEXT_CHARS,
  },
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  // ── Helpers ────────────────────────────────────────────────────────────────
  getTranscriptText: (maxChars) => {
    const { transcriptChunks, settings } = get();
    const limit = maxChars ?? settings.chatContextChars;
    const full = transcriptChunks.map((c) => c.text).join(" ");
    return full.length > limit ? full.slice(-limit) : full;
  },
}));
