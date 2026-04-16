# TwinMind Live Suggestions

An AI-powered meeting copilot that listens to your mic, surfaces 3 live suggestions every 30 seconds, and lets you drill into any suggestion or ask follow-up questions — all grounded in the live conversation transcript.

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000), go to **Settings** (top-right of the Chat panel), and paste your [Groq API key](https://console.groq.com/keys).

4. Click the mic button and start talking.

No `.env` file needed — the API key is stored in client-side state only, never sent to any server except Groq directly via your own key.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router, Turbopack) | API routes + React in one repo, fast HMR |
| State | Zustand v5 | Single shared store across all 3 panels without prop drilling |
| Transcription | Groq Whisper Large V3 | Best open-source ASR, low latency on Groq's hardware |
| Suggestions + Chat | Groq GPT-OSS 120B (`openai/gpt-oss-120b`) | Strong instruction-following, fast on Groq |
| Styling | Tailwind CSS v4 | Dark theme, zero runtime overhead |

## Architecture

Three independent columns, each backed by a custom hook:

```
TranscriptPanel  →  useMediaRecorder  →  /api/transcribe  →  Groq Whisper
SuggestionsPanel →  useAutoRefresh    →  /api/suggestions →  Groq GPT-OSS 120B
ChatPanel        →  (Step 5)          →  /api/chat        →  Groq GPT-OSS 120B (streaming)
```

All state flows through a single Zustand store (`src/lib/store.ts`). Components are pure UI shells — all async/side-effect logic lives in `src/lib/hooks/`.

## Prompt Strategy

### Live Suggestions (`src/lib/prompts.ts`)

The suggestion prompt is given the last **3,000 characters** of transcript (configurable). It is instructed to:

- Return **exactly 3 suggestions**, each a **different type** from: `question`, `talking_point`, `answer`, `fact_check`, `context`
- Choose the mix based on what's most useful *right now* — e.g. if a question was just asked, prioritise an `answer`; if a dubious claim was made, surface a `fact_check`
- Keep each preview **under 20 words** so the card delivers value without clicking
- Return **only valid JSON** — no markdown, no preamble — to eliminate parse failures

Forcing type diversity prevents the model from defaulting to three questions every time. Keeping previews short forces the model to be specific rather than vague.

### Detailed Click Answer (`DEFAULT_DETAIL_PROMPT`)

When a suggestion card is clicked, a separate prompt sends the **full transcript context** (up to 8,000 chars) plus the suggestion type and preview. The model is asked for a **3–6 sentence, actionable response** grounded in the conversation. Using a longer context window here than for live suggestions is intentional: speed matters less for on-demand detail than for live refresh.

### Chat (`DEFAULT_CHAT_PROMPT`)

Free-form questions get the full transcript context plus the user's question. The model is instructed to answer concisely and ground its response in the conversation — so answers stay relevant rather than going off-topic.

## Tradeoffs

**30-second audio chunks vs. continuous streaming** — chunking every 30s keeps Whisper latency predictable and avoids streaming complexity. The downside is up to 30s of lag before new transcript appears. A 10s chunk would halve the lag but double Whisper API calls.

**Client-side API key** — storing the key in Zustand (in-memory only) means no server-side secret management and no backend auth layer. The key is never persisted to localStorage or sent to any endpoint other than Groq. Tradeoff: the key is visible in browser memory.

**3,000 char suggestion context vs. full transcript** — using a short tail window keeps suggestion prompts cheap and fast. The chat and detail prompts use 8,000 chars because latency is less critical there. Configurable via Settings.

**No streaming for suggestions** — suggestions are returned as a single JSON blob, which keeps parsing simple. Chat uses streaming (Step 5) because a long answer with no feedback feels broken.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build + type-check
npm run lint     # ESLint
```
