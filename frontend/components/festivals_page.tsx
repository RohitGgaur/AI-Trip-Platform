"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { use_auth_store } from "@/lib/auth_store";
import {
  fetch_festivals,
  post_festival_insight,
  type festival_insight_payload,
  type festival_row,
} from "@/lib/festivals_api";

const month_names = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const indian_states_ut = [
  "All States",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

type category_key = "all" | "religious" | "harvest" | "cultural" | "tribal" | "national";

const category_pills: { key: category_key; label: string }[] = [
  { key: "religious", label: "Religious" },
  { key: "harvest", label: "Harvest" },
  { key: "cultural", label: "Cultural" },
  { key: "tribal", label: "Tribal" },
  { key: "national", label: "National" },
];

function matches_category(f: festival_row, cat: category_key): boolean {
  if (cat === "all") return true;
  const blob = `${f.name} ${f.description} ${f.type.join(" ")}`.toLowerCase();
  switch (cat) {
    case "national":
      return f.type.some((t) => /national|gazetted/i.test(t));
    case "religious":
      return (
        f.type.some((t) => /religious|optional holiday|restricted/i.test(t)) ||
        /diwali|eid|christmas|holi|guru|purnima|navaratri|ramadan|janmashtami|maha|good friday|easter|vesak|buddha|mahavir|guru nanak|basava|onam|janmashtami/i.test(
          blob
        )
      );
    case "harvest":
      return /lohri|pongal|bihu|baisakhi|onam|makar|ugadi|nuakhai|sankranti|harvest|bihu|bhogali|magh/i.test(
        blob
      );
    case "cultural":
      return (
        /cultural|observance|republic|independence|gandhi|children|women|labour|may day|new year/i.test(
          blob
        ) || f.type.some((t) => /observance/i.test(t))
      );
    case "tribal":
      return /tribal|indigenous|janjat|adivasi/i.test(blob);
    default:
      return true;
  }
}

function priority_label(f: festival_row): "Medium" | "Low" {
  const t = f.type.join(" ").toLowerCase();
  if (t.includes("national") || t.includes("gazetted")) return "Medium";
  return "Low";
}

function category_tag(f: festival_row): { label: string; className: string } {
  const t = f.type.join(" ").toLowerCase();
  if (t.includes("national") || t.includes("gazetted"))
    return { label: "National", className: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30" };
  if (t.includes("religious") || /diwali|eid|holi|christmas/i.test(f.name))
    return { label: "Religious", className: "bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/30" };
  if (/lohri|pongal|bihu|sankranti|harvest|onam/i.test(f.name.toLowerCase()))
    return { label: "Harvest", className: "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/35" };
  if (t.includes("season")) return { label: "Season", className: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25" };
  const raw = f.type[0] || "Festival";
  return { label: raw.replace(/\s+holiday/i, "").trim(), className: "bg-white/10 text-white/80 ring-1 ring-white/15" };
}

function festival_emoji(f: festival_row): string {
  const n = f.name.toLowerCase();
  if (n.includes("christmas")) return "🎄";
  if (n.includes("diwali")) return "🪔";
  if (n.includes("holi")) return "🎨";
  if (n.includes("eid")) return "🌙";
  if (n.includes("republic")) return "🇮🇳";
  if (n.includes("independence")) return "🇮🇳";
  if (n.includes("new year")) return "🎉";
  if (n.includes("guru") || n.includes("nanak")) return "🙏";
  if (n.includes("pongal") || n.includes("lohri") || n.includes("bihu")) return "🌾";
  return "📅";
}

function format_card_date(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const m = d.toLocaleString("en-IN", { month: "short" });
  const day = d.getDate();
  return `${m} ${day} • 1 day`;
}

function format_short_date(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const m = d.toLocaleString("en-IN", { month: "short" });
  return `${m} ${d.getDate()}`;
}

function short_states_hint(f: festival_row): string {
  if (!f.states?.length) return "India";
  if (f.states.some((s) => /all states/i.test(s))) return "All India";
  if (f.states.length === 1) return f.states[0];
  return `${f.states[0]} +${f.states.length - 1}`;
}

function states_line(f: festival_row): string {
  if (!f.states?.length) return "India";
  if (f.states.some((s) => /all states/i.test(s))) return "All major cities";
  return f.states.slice(0, 4).join(" • ") + (f.states.length > 4 ? " +" : "");
}

/** Clear label for cards/modal — which state(s) this holiday applies to (from calendar API). */
function states_observed_line(f: festival_row): string {
  if (!f.states?.length) return "Observed in: India";
  if (f.states.some((s) => /all states/i.test(s))) return "Observed in: All states (national)";
  return `Observed in: ${f.states.join(", ")}`;
}

function build_calendar_cells(year: number, month_index: number): (number | null)[] {
  const first = new Date(year, month_index, 1);
  const start_pad = first.getDay();
  const days_in_month = new Date(year, month_index + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < start_pad; i++) cells.push(null);
  for (let d = 1; d <= days_in_month; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function iso_for_day(year: number, month_index: number, day: number): string {
  const m = String(month_index + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

type view_mode = "calendar" | "list";

export function FestivalsPage() {
  const user = use_auth_store((s) => s.user);
  const [detail_festival, set_detail_festival] = useState<festival_row | null>(null);
  const [year, set_year] = useState(() => new Date().getFullYear());
  const [cursor_month, set_cursor_month] = useState(() => new Date().getMonth());
  const [state_filter, set_state_filter] = useState("All States");
  const [category, set_category] = useState<category_key>("all");
  const [view, set_view] = useState<view_mode>("calendar");
  const [rows, set_rows] = useState<festival_row[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    set_loading(true);
    set_error(null);
    try {
      const id_token = await user.getIdToken();
      const state_param = state_filter === "All States" ? null : state_filter;
      const data = await fetch_festivals(id_token, { year, state: state_param });
      set_rows(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load festivals.";
      set_error(msg);
      set_rows([]);
    } finally {
      set_loading(false);
    }
  }, [user, year, state_filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((f) => matches_category(f, category)),
    [rows, category]
  );

  const by_month = useMemo(() => {
    const map = new Map<number, festival_row[]>();
    for (const f of filtered) {
      const m = f.month - 1;
      if (m < 0 || m > 11) continue;
      const list = map.get(m) ?? [];
      list.push(f);
      map.set(m, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [filtered]);

  const month_slice = useMemo(() => {
    return (by_month.get(cursor_month) ?? []).sort((a, b) => a.date.localeCompare(b.date));
  }, [by_month, cursor_month]);

  const festivals_on_day = useCallback(
    (day: number): festival_row[] => {
      if (!day) return [];
      const iso = iso_for_day(year, cursor_month, day);
      return filtered.filter((f) => f.date === iso);
    },
    [filtered, year, cursor_month]
  );

  const bump_month = (delta: number) => {
    set_cursor_month((m) => {
      let next = m + delta;
      let y = year;
      while (next < 0) {
        next += 12;
        y -= 1;
      }
      while (next > 11) {
        next -= 12;
        y += 1;
      }
      set_year(y);
      return next;
    });
  };

  const pill_class = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/40"
        : "bg-white/5 text-white/70 hover:bg-white/10"
    }`;

  const cells = useMemo(() => build_calendar_cells(year, cursor_month), [year, cursor_month]);

  return (
    <>
      {detail_festival ? (
        <FestivalInsightModal festival={detail_festival} on_close={() => set_detail_festival(null)} />
      ) : null}
      <div className="-mx-4 min-h-full bg-[#121212] px-4 py-3 text-white sm:-mx-6 sm:px-6 sm:py-4 md:-mx-8 md:px-8 md:py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-white sm:text-[1.85rem]">
              India Festival Calendar {year}
            </h1>
            <p className="mt-1.5 max-w-xl text-[0.9375rem] leading-snug text-white/50">
              Discover festivals, plan around peak seasons, book ahead.
            </p>
          </div>
          <div className="flex w-full shrink-0 rounded-xl border border-white/[0.07] bg-[#0a0a0a] p-1 sm:w-auto">
            <button
              type="button"
              onClick={() => set_view("calendar")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-initial ${
                view === "calendar"
                  ? "bg-white/[0.12] text-white shadow-sm ring-1 ring-white/15"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span aria-hidden className="opacity-90">
                ▦
              </span>
              Calendar
            </button>
            <button
              type="button"
              onClick={() => set_view("list")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-initial ${
                view === "list"
                  ? "bg-white/[0.12] text-white shadow-sm ring-1 ring-white/15"
                  : "text-white/55 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span aria-hidden className="opacity-90">
                ☰
              </span>
              List
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#141414] px-3.5 py-2.5 text-sm text-white/90 sm:max-w-md sm:min-w-[220px]">
                <span className="shrink-0 text-base text-white/40" aria-hidden>
                  📍
                </span>
                <select
                  value={state_filter}
                  onChange={(e) => set_state_filter(e.target.value)}
                  className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-2 text-sm font-medium outline-none"
                  aria-label="Filter by state"
                >
                  {indian_states_ut.map((s) => (
                    <option key={s} value={s} className="bg-[#1a1a1a] text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {category_pills.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set_category((c) => (c === key ? "all" : key))}
                    className={pill_class(category === key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-center gap-1 sm:justify-end">
              <span className="mr-1 hidden text-xs font-medium text-white/40 sm:inline">Year</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-lg text-white/75 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                onClick={() => set_year((y) => y - 1)}
                aria-label="Previous year"
              >
                ‹
              </button>
              <span className="min-w-[2.75rem] text-center text-sm font-bold tabular-nums text-white">{year}</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-lg text-white/75 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                onClick={() => set_year((y) => y + 1)}
                aria-label="Next year"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-10 text-center text-sm text-white/50">Loading festivals…</p>
        ) : view === "calendar" ? (
          <>
            <div className="mt-8 flex items-center justify-between border-b border-white/[0.07] pb-4">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-xl text-white/75 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                onClick={() => bump_month(-1)}
                aria-label="Previous month"
              >
                ‹
              </button>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {month_names[cursor_month]} {year}
              </h2>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-xl text-white/75 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                onClick={() => bump_month(1)}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-white/40 sm:gap-2 sm:text-[11px]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {cells.map((day, i) => {
                const on_day = day ? festivals_on_day(day) : [];
                const has_med = on_day.some((f) => priority_label(f) === "Medium");
                const has_low = on_day.some((f) => priority_label(f) === "Low");
                return (
                  <div
                    key={i}
                    className={`relative flex min-h-[56px] flex-col rounded-xl border p-1.5 sm:min-h-[68px] sm:p-2 ${
                      !day
                        ? "border-transparent bg-transparent"
                        : "border-white/[0.06] bg-[#1a1a1a]/90 shadow-inner shadow-black/20"
                    }`}
                  >
                    {day ? (
                      <>
                        <span className="text-[11px] font-semibold tabular-nums text-white/85 sm:text-xs">{day}</span>
                        <div className="mt-auto flex min-h-[14px] flex-wrap items-center justify-center gap-0.5">
                          {has_med ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-400/95 shadow-[0_0_6px_rgba(45,212,191,0.45)]" title="Medium" />
                          ) : null}
                          {has_low ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white/40" title="Low" />
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-white/[0.06] pt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                All in {month_names[cursor_month]}{" "}
                <span className="text-white/80">({month_slice.length})</span>
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {month_slice.length === 0 ? (
                  <p className="col-span-full text-sm text-white/45">No festivals match these filters this month.</p>
                ) : (
                  month_slice.map((f) => (
                    <FestivalCard
                      key={`${f.date}-${f.name}-${f.urlid ?? ""}`}
                      variant="compact"
                      f={f}
                      on_open={() => set_detail_festival(f)}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 space-y-10">
            {filtered.length === 0 ? (
              <p className="text-sm text-white/45">No festivals match these filters.</p>
            ) : (
              month_names.map((name, idx) => {
                const list = by_month.get(idx) ?? [];
                if (list.length === 0) return null;
                return (
                  <section key={name}>
                    <div className="mb-4 flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-white">{name}</h2>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/80">
                        {list.length}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((f) => (
                        <FestivalCard
                          key={`${f.date}-${f.name}-${f.urlid ?? ""}`}
                          variant="default"
                          f={f}
                          on_open={() => set_detail_festival(f)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}

function FestivalCard({
  f,
  on_open,
  variant = "default",
}: {
  f: festival_row;
  on_open: () => void;
  variant?: "default" | "compact";
}) {
  const tag = category_tag(f);
  const pr = priority_label(f);

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={on_open}
        className="group flex h-full min-h-[148px] flex-col rounded-xl border border-white/[0.07] bg-[#161616] p-3 text-left shadow-sm ring-1 ring-white/[0.03] transition hover:border-teal-500/40 hover:bg-[#1a1a1a] hover:shadow-[0_12px_40px_-16px_rgba(45,212,191,0.25)]"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-lg transition group-hover:bg-white/[0.12]"
            aria-hidden
          >
            {festival_emoji(f)}
          </span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              pr === "Medium"
                ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/30"
                : "bg-white/[0.08] text-white/50 ring-1 ring-white/10"
            }`}
          >
            {pr}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 flex-1 text-[13px] font-semibold leading-snug text-white sm:text-sm">
          {f.name}
        </h3>
        <p className="mt-1.5 text-[11px] text-white/45">{format_short_date(f.date)}</p>
        <span className={`mt-2 w-fit rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${tag.className}`}>
          {tag.label}
        </span>
        <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-teal-400/90">{states_observed_line(f)}</p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={on_open}
      className="relative flex w-full gap-3 rounded-2xl border border-white/[0.08] bg-[#161616] p-4 text-left shadow-sm ring-1 ring-white/[0.03] transition hover:border-teal-500/35 hover:bg-[#1a1a1a]"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-xl"
        aria-hidden
      >
        {festival_emoji(f)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-white">{f.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              pr === "Medium"
                ? "bg-teal-500/25 text-teal-200 ring-1 ring-teal-400/35"
                : "bg-white/10 text-white/55 ring-1 ring-white/15"
            }`}
          >
            {pr}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
          <span aria-hidden>🕐</span>
          {format_card_date(f.date)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>{tag.label}</span>
          <span className="text-[11px] text-white/40">{short_states_hint(f)}</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-teal-300/95">{states_observed_line(f)}</p>
        <p className="mt-1 flex items-start gap-1 text-xs text-white/55">
          <span className="mt-0.5 shrink-0" aria-hidden>
            📍
          </span>
          {states_line(f)}
        </p>
      </div>
      <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-40" aria-hidden>
        <span className="h-2 w-0.5 rounded-sm bg-orange-400/80" />
        <span className="h-3 w-0.5 rounded-sm bg-orange-400/80" />
        <span className="h-4 w-0.5 rounded-sm bg-orange-400/80" />
      </div>
    </button>
  );
}

function FestivalInsightModal({
  festival,
  on_close,
}: {
  festival: festival_row;
  on_close: () => void;
}) {
  const user = use_auth_store((s) => s.user);
  const [insight, set_insight] = useState<festival_insight_payload | null>(null);
  const [loading, set_loading] = useState(true);
  const [load_error, set_load_error] = useState<string | null>(null);

  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      if (e.key === "Escape") on_close();
    };
    window.addEventListener("keydown", on_key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on_key);
      document.body.style.overflow = prev;
    };
  }, [on_close]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      set_loading(true);
      set_load_error(null);
      set_insight(null);
      try {
        const id_token = await user.getIdToken();
        const { insight: ins } = await post_festival_insight(id_token, {
          name: festival.name,
          date: festival.date,
          description: festival.description,
          type: festival.type,
          states: festival.states,
        });
        if (!cancelled) set_insight(ins);
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "response" in e
            ? String((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message)
            : e instanceof Error
              ? e.message
              : "Could not load AI details.";
        if (!cancelled) set_load_error(msg || "Could not load AI details.");
      } finally {
        if (!cancelled) set_loading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [festival, user]);

  const tag = category_tag(festival);
  const pr = priority_label(festival);
  const ti = insight?.travel_impact;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={on_close}
      />
      <div className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#141414] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Festival detail</span>
          <button
            type="button"
            onClick={on_close}
            className="rounded-lg px-2 py-1 text-lg leading-none text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-5">
          {/* Header card */}
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl"
                aria-hidden
              >
                {festival_emoji(festival)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold leading-snug text-white">{festival.name}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      pr === "Medium"
                        ? "bg-teal-500/25 text-teal-200 ring-1 ring-teal-400/35"
                        : "bg-white/10 text-white/55 ring-1 ring-white/15"
                    }`}
                  >
                    {pr}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                  <span aria-hidden>🕐</span>
                  {format_card_date(festival.date)}
                </p>
                <div className="mt-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>
                    {tag.label}
                  </span>
                </div>
                <p className="mt-2 flex items-start gap-1 text-xs text-white/60">
                  <span className="shrink-0" aria-hidden>
                    📍
                  </span>
                  {states_line(festival)}
                </p>
              </div>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-50" aria-hidden>
              <span className="h-2 w-0.5 rounded-sm bg-orange-400/90" />
              <span className="h-3 w-0.5 rounded-sm bg-orange-400/90" />
              <span className="h-4 w-0.5 rounded-sm bg-orange-400/90" />
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">States (calendar data)</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {festival.states?.length ? (
                  festival.states.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-teal-500/15 px-2.5 py-1 text-xs font-medium text-teal-200 ring-1 ring-teal-500/30"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/50">—</span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{states_observed_line(festival)}</p>
            </div>

            {loading ? (
              <p className="text-sm text-white/45">Generating travel insights with Gemini…</p>
            ) : null}
            {load_error ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {load_error}
              </p>
            ) : null}

            {insight ? (
              <>
                <p className="text-sm leading-relaxed text-white/80">{insight.description}</p>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Best celebrated in</h3>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-sm text-red-100">
                    <span aria-hidden>📍</span>
                    {insight.best_celebrated_in}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">States (summary)</h3>
                  <p className="mt-1.5 text-sm text-white/85">{insight.states_summary}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/55">Travel impact</h3>
                  <ul className="mt-3 space-y-2.5 text-sm text-white/80">
                    <li className="flex gap-2">
                      <span className="shrink-0 text-amber-400" aria-hidden>
                        📶
                      </span>
                      <span>{ti?.crowd_level ?? "—"}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0" aria-hidden>
                        🏢
                      </span>
                      <span>{ti?.pricing_booking ?? "—"}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0" aria-hidden>
                        🚌
                      </span>
                      <span>{ti?.transport ?? "—"}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="shrink-0 text-orange-400" aria-hidden>
                        🔥
                      </span>
                      <span>{ti?.safety_other ?? "—"}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Highlights</h3>
                  <ul className="mt-2 space-y-2">
                    {(insight.highlights || []).map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/85">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/25 text-xs text-teal-200">
                          ✓
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="flex gap-2 border-t border-white/10 pt-4 text-sm italic text-white/65">
                  <span aria-hidden>💡</span>
                  {insight.footer_tip}
                </p>
              </>
            ) : !loading && !load_error ? (
              <p className="text-sm text-white/45">No AI details available.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
