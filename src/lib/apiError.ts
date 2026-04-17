// Groq SDK errors carry a clean inner message on `.error.message` — surface that instead
// of the default `.message` which looks like `401 {"error":{...}}` when serialized.
export function toApiError(err: unknown, fallback = "Request failed") {
  const e = err as { status?: number; error?: { message?: string }; message?: string };
  const raw_msg = e?.error?.message ?? e?.message ?? fallback;
  
  const msg = raw_msg.match(/"message":"([^"]+)"/)?.[1];
  return {
    message: msg ?? raw_msg,
    status: e?.status ?? 500,
  };
}
