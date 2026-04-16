import { useAppStore } from "./store";

function filenameStamp(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function exportSession() {
  const { transcriptChunks, suggestionBatches, chatMessages } = useAppStore.getState();

  const payload = {
    exportedAt: new Date().toISOString(),
    transcript: transcriptChunks.map((c) => ({
      id: c.id,
      timestamp: c.timestamp.toISOString(),
      text: c.text,
    })),
    suggestions: [...suggestionBatches]
      .reverse()
      .map((b) => ({
        id: b.id,
        timestamp: b.timestamp.toISOString(),
        suggestions: b.suggestions,
      })),
    chat: chatMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      ...(m.suggestionType ? { suggestionType: m.suggestionType } : {}),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `twinind-session-${filenameStamp(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
