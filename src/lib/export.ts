import { useAppStore } from "./store";

function filenameStamp(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function duration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function exportSession() {
  const { transcriptChunks, suggestionBatches, chatMessages } =
    useAppStore.getState();

  const sortedBatches = [...suggestionBatches].reverse();

  const allDates = [
    ...transcriptChunks.map((c) => c.timestamp),
    ...sortedBatches.map((b) => b.timestamp),
    ...chatMessages.map((m) => m.timestamp),
  ].sort((a, b) => a.getTime() - b.getTime());

  const startTime = allDates[0] ?? new Date();
  const endTime = allDates[allDates.length - 1] ?? new Date();

  const payload = {
    session: {
      exportedAt: new Date().toISOString(),
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
      duration: duration(startTime, endTime),
      stats: {
        transcriptChunks: transcriptChunks.length,
        suggestionBatches: sortedBatches.length,
        totalSuggestions: sortedBatches.reduce(
          (sum, b) => sum + b.suggestions.length,
          0
        ),
        chatMessages: chatMessages.length,
        suggestionsClicked: chatMessages.filter((m) => m.suggestionType).length,
      },
    },

    transcript: transcriptChunks.map((c) => ({
      time: formatTime(c.timestamp),
      text: c.text,
    })),

    suggestions: sortedBatches.map((b) => ({
      time: formatTime(b.timestamp),
      suggestions: b.suggestions.map((s) => ({
        type: s.type,
        preview: s.preview,
      })),
    })),

    chat: chatMessages.map((m) => ({
      time: formatTime(m.timestamp),
      role: m.role,
      ...(m.suggestionType && { triggeredBy: m.suggestionType }),
      content: m.content,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `twinmind-session-${filenameStamp(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}