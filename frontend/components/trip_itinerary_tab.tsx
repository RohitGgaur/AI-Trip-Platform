"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { stream_ai_itinerary, type ai_budget_preference } from "@/lib/ai_itinerary_stream";
import { fetch_itinerary, type itinerary_day } from "@/lib/itinerary_api";
import { fetch_trip, type trip_detail } from "@/lib/trips_api";
import {
  format_trip_day_short,
  inclusive_day_count,
  parse_trip_date,
} from "@/lib/trip_utils";
import { get_firebase_auth } from "@/lib/firebase_client";

function strip_possible_fences(raw: string): string {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}

/**
 * Best-effort incremental parser for Gemini's "JSON array of day objects".
 * As the SSE stream grows, this extracts any *complete* top-level objects inside the array.
 */
function extract_complete_day_objects(stream: string): unknown[] {
  const text = strip_possible_fences(stream);
  const start_idx = text.indexOf("[");
  if (start_idx < 0) return [];

  let in_str = false;
  let esc = false;
  let depth = 0;
  let obj_start = -1;
  const out: unknown[] = [];

  for (let i = start_idx; i < text.length; i++) {
    const ch = text[i]!;
    if (in_str) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === '"') {
        in_str = false;
      }
      continue;
    }

    if (ch === '"') {
      in_str = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) obj_start = i;
      depth++;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && obj_start >= 0) {
        const obj_text = text.slice(obj_start, i + 1);
        try {
          out.push(JSON.parse(obj_text));
        } catch {
          // ignore incomplete/invalid object
        }
        obj_start = -1;
      }
    }
  }

  return out;
}

function map_trip_budget_to_ai_preference(trip: trip_detail | null): ai_budget_preference {
  const raw = (trip?.budgetStyle || "").toLowerCase();
  if (raw === "backpacker") return "backpacker";
  if (raw === "luxury") return "luxury";
  return "mid";
}

function trip_dates_to_iso(trip: trip_detail): { start: string; end: string } | null {
  const s = parse_trip_date(trip.startDate);
  const e = parse_trip_date(trip.endDate);
  if (!s || !e) return null;
  return {
    start: s.toISOString().slice(0, 10),
    end: e.toISOString().slice(0, 10),
  };
}

function category_label(category: string): string {
  const c = category.toLowerCase();
  const map: Record<string, string> = {
    food: "Food",
    sightseeing: "Sightseeing",
    adventure: "Adventure",
    transport: "Transport",
    accommodation: "Accommodation",
    other: "Other",
  };
  return map[c] || category;
}

function category_badge_class(category: string): string {
  const c = category.toLowerCase();
  if (c === "food") return "bg-orange-100 text-orange-900 ring-orange-200/80";
  if (c === "sightseeing") return "bg-sky-100 text-sky-900 ring-sky-200/80";
  if (c === "adventure") return "bg-emerald-100 text-emerald-900 ring-emerald-200/80";
  if (c === "transport") return "bg-violet-100 text-violet-900 ring-violet-200/80";
  if (c === "accommodation") return "bg-amber-100 text-amber-900 ring-amber-200/80";
  return "bg-stone-100 text-stone-800 ring-stone-200/80";
}

function read_err(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data?.error?.message;
    if (typeof m === "string") return m;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export function TripItineraryTab({ trip_id }: { trip_id: string }) {
  const [trip, set_trip] = useState<trip_detail | null>(null);
  const [days, set_days] = useState<itinerary_day[]>([]);
  const [loading, set_loading] = useState(true);
  const [generating, set_generating] = useState(false);
  const [stream_text, set_stream_text] = useState("");
  const [stream_days, set_stream_days] = useState<unknown[]>([]);
  const [expanded, set_expanded] = useState<Record<string, boolean>>({});
  const expand_init = useRef(false);

  const num_trip_days = useMemo(() => {
    if (!trip) return 0;
    const s = parse_trip_date(trip.startDate);
    const e = parse_trip_date(trip.endDate);
    if (!s || !e) return 0;
    return inclusive_day_count(s, e);
  }, [trip]);

  const stream_highlight_days = useMemo(() => {
    if (!generating || num_trip_days <= 0) return 0;
    const n = Math.min(num_trip_days, Math.max(1, Math.floor(stream_text.length / 650)));
    return n;
  }, [generating, num_trip_days, stream_text.length]);

  const load_all = useCallback(async () => {
    set_loading(true);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) return;
      const id_token = await user.getIdToken();
      const [t, d] = await Promise.all([fetch_trip(id_token, trip_id), fetch_itinerary(id_token, trip_id)]);
      set_trip(t);
      set_days(d);
      if (!expand_init.current && d.length > 0) {
        expand_init.current = true;
        set_expanded({ [d[0]!.dayId]: true });
      }
    } catch (e) {
      toast.error(read_err(e));
      set_days([]);
    } finally {
      set_loading(false);
    }
  }, [trip_id]);

  useEffect(() => {
    load_all();
  }, [load_all]);

  const toggle_day = (day_id: string) => {
    set_expanded((s) => ({ ...s, [day_id]: !s[day_id] }));
  };

  const run_generate = async () => {
    if (!trip || generating) return;
    const dates = trip_dates_to_iso(trip);
    if (!dates) {
      toast.error("Trip dates missing — cannot generate.");
      return;
    }
    set_generating(true);
    set_stream_text("");
    set_stream_days([]);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) {
        toast.error("Sign in again.");
        return;
      }
      const id_token = await user.getIdToken();
      await stream_ai_itinerary(
        id_token,
        {
          tripId: trip_id,
          destination: trip.destination || "",
          startDate: dates.start,
          endDate: dates.end,
          budgetPreference: map_trip_budget_to_ai_preference(trip),
          interests: [],
        },
        {
          on_chunk: (_, full) => {
            set_stream_text(full);
            set_stream_days(extract_complete_day_objects(full));
          },
          on_done: async (saved) => {
            set_stream_text("");
            set_stream_days([]);
            set_generating(false);
            toast.success(saved ? `Itinerary ready — ${saved} day(s).` : "Itinerary ready.");
            await load_all();
          },
          on_error: (msg) => {
            set_stream_text("");
            set_stream_days([]);
            set_generating(false);
            toast.error(msg);
          },
        }
      );
    } catch (e) {
      set_generating(false);
      set_stream_text("");
      set_stream_days([]);
      toast.error(read_err(e));
    }
  };

  const gen_btn_class =
    "inline-flex items-center justify-center gap-1.5 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5";

  const is_empty = days.length === 0;
  const parsed_stream_day_count = Array.isArray(stream_days) ? stream_days.length : 0;

  return (
    <div className="w-full pb-10">
      <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-14px_rgba(11,22,40,0.14)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Plan</p>
            <h1 className="font_display mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">Itinerary</h1>
            <p className="mt-1 text-sm text-stone-600">Day-by-day schedule for this trip.</p>
          </div>
          <button type="button" className={gen_btn_class} disabled={generating || !trip} onClick={run_generate}>
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating…
              </>
            ) : (
              <>✨ Generate with AI</>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-stone-500">Loading itinerary…</p>
      ) : generating && is_empty ? (
        <div className="mt-10 space-y-4">
          <p className="text-center text-sm font-medium text-stone-600">AI is building your days — hang tight…</p>
          <div className="space-y-3">
            {Array.from({ length: Math.max(1, num_trip_days) }, (_, i) => (
              <div
                key={i}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                  i < parsed_stream_day_count
                    ? "border-purple-300 ring-2 ring-purple-200/80"
                    : i < stream_highlight_days
                      ? "border-purple-200/70"
                      : "border-stone-200/90 opacity-70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-900">
                    Day {i + 1}
                  </span>
                  {i < parsed_stream_day_count ? (
                    <span className="text-xs text-purple-700">Streaming…</span>
                  ) : i < stream_highlight_days ? (
                    <span className="text-xs text-purple-700">Thinking…</span>
                  ) : (
                    <span className="text-xs text-stone-400">Waiting…</span>
                  )}
                </div>
                {i < parsed_stream_day_count && typeof (stream_days[i] as any)?.title === "string" ? (
                  <p className="mt-3 font_display text-base font-semibold text-stone-900">
                    {(stream_days[i] as any).title}
                  </p>
                ) : (
                  <div className="mt-3 h-3 w-[75%] animate-pulse rounded bg-stone-100" />
                )}
                {i < parsed_stream_day_count && Array.isArray((stream_days[i] as any)?.activities) ? (
                  <p className="mt-1 text-sm text-stone-600">
                    {Math.min(6, ((stream_days[i] as any).activities as any[]).length)} activity slot(s)…
                  </p>
                ) : (
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-stone-100" />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : is_empty ? (
        <div className="mx-auto mt-16 flex max-w-md flex-col items-center text-center">
          <p className="text-lg font-medium text-stone-800">No itinerary yet</p>
          <button type="button" className={`${gen_btn_class} mt-6`} disabled={generating || !trip} onClick={run_generate}>
            {generating ? "Generating…" : "✨ Generate with AI"}
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {generating ? (
            <div className="rounded-xl border border-purple-200 bg-purple-50/80 px-4 py-3 text-sm text-purple-950">
              Regenerating itinerary… days will refresh when complete.
            </div>
          ) : null}
          {days
            .slice()
            .sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0))
            .map((day) => {
              const d = parse_trip_date(day.date);
              const date_label = d ? format_trip_day_short(d) : "—";
              const open = Boolean(expanded[day.dayId]);
              const acts = Array.isArray(day.activities) ? day.activities : [];
              return (
                <div
                  key={day.dayId}
                  className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(28,31,29,0.08)]"
                >
                  <button
                    type="button"
                    onClick={() => toggle_day(day.dayId)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-stone-50/80 sm:px-5"
                  >
                    <span className="shrink-0 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white">
                      Day {day.dayNumber ?? "—"}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-stone-500">{date_label}</span>
                    {day.aiGenerated ? (
                      <span className="shrink-0 text-base text-purple-600" title="AI generated" aria-label="AI generated">
                        ✨
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate font_display text-base font-semibold text-stone-900 sm:text-lg">
                      {day.title || "Untitled day"}
                    </span>
                    <span className="shrink-0 text-stone-500" aria-hidden>
                      {open ? "▲" : "▼"}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-stone-100 px-4 pb-4 pt-2 sm:px-5">
                      <ul className="space-y-4">
                        {acts.map((act, idx) => (
                          <li
                            key={`${day.dayId}-${idx}`}
                            className="rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-3 sm:px-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[#9c4221]">{act.time}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${category_badge_class(act.category)}`}
                              >
                                {category_label(act.category)}
                              </span>
                            </div>
                            <p className="mt-1 font-semibold text-stone-900">{act.title}</p>
                            {act.locationName ? (
                              <p className="mt-0.5 text-sm text-stone-600">📍 {act.locationName}</p>
                            ) : null}
                            <p className="mt-1 text-sm text-stone-600">
                              Est. cost:{" "}
                              <span className="font-semibold text-stone-800">
                                {trip?.currency || "INR"}{" "}
                                {typeof act.estimatedCost === "number"
                                  ? act.estimatedCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                                  : "—"}
                              </span>
                            </p>
                            {act.description ? (
                              <p className="mt-2 text-sm leading-relaxed text-stone-600">{act.description}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
