import axios from "axios";

/** Never pass raw objects to toast — avoids "[object Object]". */
function stringify_unknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim() || "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "Something went wrong.";
  }
}

/** Reads `{ success, error: { code, message } }` or `{ message }` from API JSON. */
export function api_error_text_from_body(data: unknown): string {
  if (typeof data === "string") {
    const t = data.trim();
    if (t.startsWith("<!") || t.startsWith("<html")) {
      return "Server returned HTML instead of JSON — check API URL and that the backend is running.";
    }
    return t.length > 400 ? `${t.slice(0, 400)}…` : t;
  }
  if (data == null || typeof data !== "object") return "Request failed.";
  const root = data as Record<string, unknown>;

  const err_obj = root.error;
  if (err_obj != null && typeof err_obj === "object") {
    const msg = (err_obj as Record<string, unknown>).message;
    const s = stringify_unknown(msg);
    if (s) return s.length > 500 ? `${s.slice(0, 500)}…` : s;
  }

  const top = stringify_unknown(root.message);
  if (top) return top.length > 500 ? `${top.slice(0, 500)}…` : top;

  return "Request failed.";
}

/** Axios error → single user-visible line (works for 4xx/5xx JSON and network errors). */
export function axios_error_text(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const from_json = api_error_text_from_body(err.response?.data);
    if (from_json !== "Request failed.") return from_json;
    const status = err.response?.status;
    if (status != null) {
      return `HTTP ${status}. ${err.message || "Request failed."}`;
    }
    return err.message || "Network error.";
  }
  if (err instanceof Error) return err.message;
  return stringify_unknown(err);
}

/** XHR upload error JSON (same shape as axios body). */
export function xhr_error_text(json: unknown, http_status: number): string {
  const from_body = api_error_text_from_body(json);
  if (from_body !== "Request failed.") return from_body;
  return `Upload failed (HTTP ${http_status}).`;
}
