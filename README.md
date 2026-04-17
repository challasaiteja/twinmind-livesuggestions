# TwinMind Live Suggestions

An AI-powered meeting copilot that listens to your mic, surfaces 3 live suggestions every 30 seconds, and lets you drill into any suggestion or chat freely — all grounded in the live conversation transcript.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click the gear icon in the Chat panel, paste your [Groq API key](https://console.groq.com/keys), then hit the mic button.

No `.env` needed. The key is held in client memory only and sent directly to Groq on each request via the `x-groq-api-key` header — it never hits another server and is not persisted.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router, Turbopack) | API routes + React in one repo, fast HMR |
| State | Zustand v5 | Single shared store across all 3 panels, no prop drilling |
| Transcription | Groq Whisper Large V3 | Strong ASR, low latency on Groq's hardware |
| Suggestions + Chat | Groq GPT-OSS 120B (`openai/gpt-oss-120b`) | Strong instruction-following, fast on Groq |
| Styling | Tailwind CSS v4 | Dark theme, zero runtime |
| Toasts | sonner | Single error surface for all 3 panels |

## Architecture

Three independent columns ([ClientApp.tsx](src/components/ClientApp.tsx)), each backed by a custom hook:

```
TranscriptPanel  →  useMediaRecorder  →  /api/transcribe   →  Groq Whisper
SuggestionsPanel →  useAutoRefresh    →  /api/suggestions  →  Groq GPT-OSS 120B
ChatPanel        →  useChat           →  /api/chat         →  Groq GPT-OSS 120B (streaming)
```

All state flows through a single Zustand store ([src/lib/store.ts](src/lib/store.ts)). Components are pure UI shells — all async/side-effect logic lives in [src/lib/hooks/](src/lib/hooks/). Errors from every hook and every route surface through `sonner` toasts (bottom-right, auto-dismiss).

### Recording pipeline

[useMediaRecorder.ts](src/lib/hooks/useMediaRecorder.ts) rotates `MediaRecorder` instances every 30s so chunks land as discrete webm files without dropping audio between rotations. Each chunk is POSTed to `/api/transcribe` with a 200-char tail of prior transcript as Whisper's `prompt` parameter to stabilise proper nouns across boundaries. Chunks are inserted into the store by monotonically-increasing `seq` so out-of-order transcription responses still yield an ordered transcript.

### Suggestions pipeline

[useAutoRefresh.ts](src/lib/hooks/useAutoRefresh.ts) drives a 30-second auto-refresh cycle while recording. It also fires an immediate refresh when the first chunk of a new session lands and a final refresh 2.5s after recording stops so the last chunk has time to transcribe. A `inFlightRef` single-flight guard prevents manual reloads from colliding with the auto-tick. The last 3 batches of suggestions are passed back into the prompt as `{previous_suggestions}` so the model knows what's already been shown.

### Chat pipeline

[useChat.ts](src/lib/hooks/useChat.ts) streams `/api/chat` responses token-by-token via `res.body.getReader()`, appending deltas into the last assistant message. An `isStreaming` flag guards against concurrent streams. The last 6 turns of chat history (capped at 2000 chars) are passed back as `{chat_history}` so the model can resolve follow-ups like "expand on that". Clicking a suggestion card calls `sendSuggestion`, which fills the detail prompt and streams the answer into the same chat thread.

## Prompt strategy

All three prompts live in [src/lib/prompts.ts](src/lib/prompts.ts) and are user-editable from Settings with one-click reset to defaults.

### Live suggestions (`DEFAULT_SUGGESTION_PROMPT`)

Given the last 3,000 characters of transcript (configurable) plus the previous 3 batches already shown to the user. The model must:

- Return **exactly 3 suggestions**, each a **different type** from: `question`, `talking_point`, `answer`, `fact_check`, `context`.
- Pick the 3 types most useful *right now* — no fixed combo. A just-asked question leans toward `answer`; a dubious claim leans toward `fact_check`.
- Keep each preview ≤18 words — immediately actionable, readable without clicking.
- Not repeat or closely rephrase anything in `{previous_suggestions}`.
- Return JSON only — enforced by `response_format: { type: "json_object" }` on the Groq side and a type/shape validator on the server.

Forcing type diversity prevents three-questions-every-time. Phase awareness in the prompt (conversation opening / mid-flow / wrapping up) shapes what the model leads with.

### Detail (`DEFAULT_DETAIL_PROMPT`)

Fired when a suggestion card is clicked. Gets the suggestion type, preview, and full transcript (up to 8,000 chars — a wider window than live suggestions because latency matters less on-demand). Asks for a bold headline, 2–4 transcript-grounded bullets, and a literal "Say: …" line the participant can speak out loud. Output is plain markdown only.

### Chat (`DEFAULT_CHAT_PROMPT`)

Free-form questions get the transcript (8,000 chars) plus the recent `{chat_history}` plus the user's `{question}`. The model is instructed to ground answers in the transcript, resolve follow-ups using chat history, and fall back to general knowledge only when the transcript doesn't cover it.

## Tradeoffs

**30-second audio chunks vs. continuous streaming** — chunking keeps Whisper latency predictable and avoids the complexity of a streaming transcription socket. Cost: up to 30s of lag before new transcript appears.

**Client-side API key** — storing the key in Zustand (in-memory only, never `localStorage`) means no server-side secret management and no backend auth layer. Cost: the key is visible in devtools and lost on refresh.

**Non-streaming suggestions vs. streaming chat** — suggestions are a single ~100-token JSON blob, so streaming would save only ~200ms and complicates per-line parsing. Chat answers can be long, so streaming is essential for perceived latency. Different tools, different choices.

**Configurable context windows** — separate `suggestionContextChars` (3000) and `chatContextChars` (8000) defaults trade prompt cost for groundedness. Both live in Settings.

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # streaming chat
│   │   ├── suggestions/route.ts   # JSON-object suggestions
│   │   └── transcribe/route.ts    # Whisper transcription
│   ├── layout.tsx
│   └── page.tsx                   # dynamic import of ClientApp with ssr:false
├── components/
│   ├── ClientApp.tsx              # 3-column shell + Toaster
│   ├── ChatPanel.tsx              # markdown rendering, export, settings
│   ├── ColumnHeader.tsx           # shared header primitive
│   ├── SettingsModal.tsx          # API key, prompts, context windows
│   ├── SuggestionsPanel.tsx       # cards, batches, reload, countdown
│   └── TranscriptPanel.tsx        # mic button, live transcript
└── lib/
    ├── apiError.ts                # pulls Groq's inner error message out of SDK blob
    ├── export.ts                  # session → JSON download
    ├── hooks/                     # useMediaRecorder, useAutoRefresh, useChat
    ├── prompts.ts                 # default prompts + context-window defaults
    ├── store.ts                   # Zustand store: types + actions
    └── suggestionTypes.ts         # TYPE_STYLES + TYPE_LABELS per suggestion type
```

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build + type-check
npm run lint     # ESLint — must pass before every commit
```
