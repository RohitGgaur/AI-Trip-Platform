/** Firestore Timestamp JSON / ISO string → Date */
export function parse_trip_date(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object") {
    const o = value as { _seconds?: number; seconds?: number };
    const sec = typeof o._seconds === "number" ? o._seconds : typeof o.seconds === "number" ? o.seconds : null;
    if (sec != null) return new Date(sec * 1000);
  }
  return null;
}

export function inclusive_day_count(start: Date, end: Date): number {
  const s = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const e = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

const fallback_cover_urls = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503220317374-4ada1aa1fe88?w=800&q=80&auto=format&fit=crop",
];

export function trip_cover_image_url(cover_url: string | null | undefined, seed: string): string {
  if (cover_url && typeof cover_url === "string" && cover_url.startsWith("http")) return cover_url;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 1_000_000;
  return fallback_cover_urls[h % fallback_cover_urls.length]!;
}

export type trip_status_ui = "planning" | "ongoing" | "completed";

export function normalise_trip_status(raw: string | undefined): trip_status_ui {
  const s = (raw || "").toLowerCase();
  if (s === "ongoing" || s === "completed" || s === "planning") return s;
  return "planning";
}

export function trip_status_label(status: trip_status_ui): string {
  if (status === "planning") return "Planning";
  if (status === "ongoing") return "Ongoing";
  return "Completed";
}

export function format_trip_day_short(d: Date, locale = "en-IN"): string {
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}
