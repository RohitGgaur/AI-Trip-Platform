import axios from "axios";

/**
 * API origin for axios calls: `{origin}/v1/...` (see usages).
 *
 * Priority:
 * 1. `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8000/v1` or `http://localhost:8000`)
 * 2. `NEXT_PUBLIC_API_BASE_URL` (same idea, legacy name)
 *
 * If `/v1` is included in the env value, it is stripped — callers always append `/v1` themselves.
 *
 * When neither is set in the browser and NODE_ENV is development, returns `""` so requests go to
 * same-origin `/v1/*` (Next.js `rewrites` → backend). Set `NEXT_PUBLIC_API_URL` to hit `:8000` directly.
 */
function normalize_api_origin(raw: string): string {
  let s = raw.trim().replace(/\/+$/, "");
  if (!s) return "";
  // Avoid .../v1/v1/trips — env often ends with /v1
  if (s.endsWith("/v1")) {
    s = s.slice(0, -3).replace(/\/+$/, "");
  }
  return s;
}

export function get_api_base(): string {
  const configured =
    normalize_api_origin(process.env.NEXT_PUBLIC_API_URL || "") ||
    normalize_api_origin(process.env.NEXT_PUBLIC_API_BASE_URL || "");

  if (typeof window === "undefined") {
    return configured || "http://127.0.0.1:8000";
  }

  if (configured) {
    // Avoid mixed-content: if the page is HTTPS, don't call an HTTP API origin directly.
    // Use same-origin `/v1/*` which is proxied by Next.js rewrites.
    if (window.location.protocol === "https:" && configured.startsWith("http://")) {
      return "";
    }
    return configured;
  }

  if (process.env.NODE_ENV === "development") {
    return "";
  }

  return "";
}

export type register_body = {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL?: string | null;
};

export async function backend_register(body: register_body) {
  const { data } = await axios.post(`${get_api_base()}/v1/auth/register`, body, {
    timeout: 25_000,
  });
  return data;
}

export async function backend_fetch_me(id_token: string) {
  const { data } = await axios.get(`${get_api_base()}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${id_token}` },
    timeout: 25_000,
  });
  return data;
}
