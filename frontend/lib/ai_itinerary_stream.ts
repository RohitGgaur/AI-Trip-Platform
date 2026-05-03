import { get_api_base } from "@/lib/auth_api";

export type ai_budget_preference = "backpacker" | "mid" | "luxury";

export type generate_itinerary_body = {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetPreference: ai_budget_preference;
  interests: string[];
};

type sse_event =
  | { chunk: string }
  | { done: true; savedDays: number }
  | { error: string; raw?: string; code?: string };

function parse_sse_data_line(line: string): sse_event | null {
  const trimmed = line.trim();
  if (!trimmed.toLowerCase().startsWith("data:")) return null;
  const json_str = trimmed.slice(5).trim();
  if (!json_str) return null;
  try {
    return JSON.parse(json_str) as sse_event;
  } catch {
    return null;
  }
}

/**
 * POST /v1/ai/itinerary — SSE stream (chunk / done / error).
 */
export async function stream_ai_itinerary(
  id_token: string,
  body: generate_itinerary_body,
  handlers: {
    on_chunk: (text: string, full_so_far: string) => void;
    on_done: (saved_days: number) => void;
    on_error: (message: string) => void;
  }
): Promise<void> {
  const url = `${get_api_base()}/v1/ai/itinerary`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${id_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: { message?: string } };
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* ignore */
    }
    handlers.on_error(msg);
    return;
  }

  if (!res.body) {
    handlers.on_error("No response body.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full_stream = "";

  const process_block = (block: string): boolean => {
    for (const line of block.split(/\r?\n/)) {
      const ev = parse_sse_data_line(line);
      if (!ev) continue;
      if ("chunk" in ev && typeof ev.chunk === "string") {
        full_stream += ev.chunk;
        handlers.on_chunk(ev.chunk, full_stream);
      } else if ("done" in ev && ev.done === true) {
        handlers.on_done(typeof ev.savedDays === "number" ? ev.savedDays : 0);
        return true;
      } else if ("error" in ev && typeof ev.error === "string") {
        handlers.on_error(ev.error);
        return true;
      }
    }
    return false;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const block of parts) {
      if (process_block(block)) return;
    }
  }

  if (buffer.trim() && process_block(buffer)) return;

  handlers.on_error("Stream ended without completion.");
}
