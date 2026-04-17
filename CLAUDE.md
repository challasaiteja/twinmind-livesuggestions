# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build + type-check
npm run lint     # ESLint (must pass before every step)
```

Always run `npm run lint && npm run build` before declaring a step complete.

## Stack

- **Next.js 16.2.4** — App Router, Turbopack. Read `node_modules/next/dist/docs/` before using any Next.js API.
- **React 19** with `"use client"` where state/effects are needed.
- **Tailwind CSS v4** — utility-first, dark theme (`bg-[#111113]`, zinc palette).
- **Zustand v5** — single store at `src/lib/store.ts` shared across all panels.
- **groq-sdk** — `"whisper-large-v3"` for transcription, `"openai/gpt-oss-120b"` for suggestions and chat.

## Architecture

Three-column layout (`ClientApp.tsx`) — each column is an independent agent:

| Column | Component | Hook | API route |
|--------|-----------|------|-----------|
| Left | `TranscriptPanel` | `useMediaRecorder` | `/api/transcribe` |
| Middle | `SuggestionsPanel` | `useAutoRefresh` | `/api/suggestions` |
| Right | `ChatPanel` | `useChat` | `/api/chat` (streaming) |

All three read/write a single Zustand store (`src/lib/store.ts`). API routes receive the Groq API key via `x-groq-api-key` header — never hardcode it or read from env.

### Key files

- `src/lib/store.ts` — types + all state: `isRecording`, `transcriptChunks`, `suggestionBatches`, `chatMessages`, `settings`
- `src/lib/prompts.ts` — default prompt templates with `{transcript}`, `{type}`, `{suggestion}`, `{question}` placeholders
- `src/lib/suggestionTypes.ts` — `TYPE_STYLES` and `TYPE_LABELS` (badge + border classes per suggestion type); import from here, never duplicate
- `src/lib/hooks/useMediaRecorder.ts` — MediaRecorder start/stop/chunk-send logic; exposes `{ isRecording, toggleRecording }`
- `src/lib/hooks/useAutoRefresh.ts` — auto-refresh + countdown intervals for suggestions; exposes `{ loading, error, countdown, isRecording, handleReload }`
- `src/lib/hooks/useChat.ts` — streams `/api/chat` into the store via `appendToLastAssistantMessage`; guards against concurrent streams with `isStreaming`; includes last `CHAT_HISTORY_TURNS` (6) turns, capped at 2000 chars
- `src/lib/export.ts` — transcript/suggestions/chat export helpers used by `ChatPanel`
- `src/components/ColumnHeader.tsx` — shared header for all 3 panels; accepts `title: string` and `status: React.ReactNode`

### Hydration

`src/app/page.tsx` uses `dynamic(() => import("@/components/ClientApp"), { ssr: false })` — the entire interactive shell is client-only. Do not add `suppressHydrationWarning` as a band-aid; the dynamic import permanently prevents all extension-caused hydration mismatches.

## Rules

- No hardcoded API keys — always pass via `x-groq-api-key` header from client settings.
- DRY: shared constants/types in `src/lib/`, shared UI primitives as components, all async/side-effect logic in `src/lib/hooks/`.
- Components are pure UI shells — no async logic, no intervals, no MediaRecorder in component bodies.
- Model names are fixed: transcription = `"whisper-large-v3"`, suggestions/chat = `"openai/gpt-oss-120b"`. Do not substitute.
- `addBatch` prepends (newest batch at top). `appendToLastAssistantMessage` supports streaming deltas.
- Use `useAppStore.getState()` inside event handlers and callbacks to avoid stale closures on store values.
