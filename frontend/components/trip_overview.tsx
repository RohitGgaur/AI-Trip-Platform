"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  fetch_trip,
  post_trip_invite,
  type trip_detail,
  type trip_member,
} from "@/lib/trips_api";
import { geocode_query_authed } from "@/lib/geocode_client";
import { fetch_open_meteo_forecast, type open_meteo_bundle } from "@/lib/open_meteo_forecast";
import {
  format_trip_day_short,
  inclusive_day_count,
  normalise_trip_status,
  parse_trip_date,
  trip_cover_image_url,
  trip_status_label,
} from "@/lib/trip_utils";
import { get_firebase_auth } from "@/lib/firebase_client";
import { use_auth_store } from "@/lib/auth_store";

function status_badge_class(status: ReturnType<typeof normalise_trip_status>): string {
  if (status === "planning") return "bg-amber-100/95 text-amber-950 ring-amber-200/80";
  if (status === "ongoing") return "bg-emerald-100/95 text-emerald-950 ring-emerald-200/80";
  return "bg-white/90 text-stone-800 ring-stone-200/90";
}

function read_err(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data?.error?.message;
    if (typeof m === "string") return m;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export function TripOverview({ trip_id }: { trip_id: string }) {
  const router = useRouter();
  const auth_user = use_auth_store((s) => s.user);
  const [trip, set_trip] = useState<trip_detail | null>(null);
  const [weather, set_weather] = useState<open_meteo_bundle | null>(null);
  const [weather_loading, set_weather_loading] = useState(false);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState<string | null>(null);
  const [invite_open, set_invite_open] = useState(false);
  const [invite_email, set_invite_email] = useState("");
  const [invite_busy, set_invite_busy] = useState(false);

  const load_trip = useCallback(async () => {
    set_loading(true);
    set_error(null);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const id_token = await user.getIdToken();
      const t = await fetch_trip(id_token, trip_id);
      set_trip(t);
    } catch (e) {
      set_error(read_err(e));
      set_trip(null);
    } finally {
      set_loading(false);
    }
  }, [trip_id, router]);

  useEffect(() => {
    load_trip();
  }, [load_trip]);

  useEffect(() => {
    if (!trip) return;
    let cancelled = false;
    (async () => {
      set_weather_loading(true);
      set_weather(null);
      try {
        const auth = get_firebase_auth();
        const user = auth.currentUser;
        if (!user) return;
        const id_token = await user.getIdToken();
        let lat = trip.destinationCoords?.latitude;
        let lng = trip.destinationCoords?.longitude;
        if (lat == null || lng == null) {
          const g = await geocode_query_authed(id_token, trip.destination || "");
          if (g) {
            lat = g.latitude;
            lng = g.longitude;
          }
        }
        if (lat == null || lng == null || cancelled) return;
        const w = await fetch_open_meteo_forecast(lat, lng);
        if (!cancelled) set_weather(w);
      } catch {
        if (!cancelled) set_weather(null);
      } finally {
        if (!cancelled) set_weather_loading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip]);

  const on_send_invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = invite_email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email.");
      return;
    }
    set_invite_busy(true);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) return;
      const id_token = await user.getIdToken();
      const invite_result = await post_trip_invite(id_token, trip_id, email);
      if (invite_result.email_sent) {
        toast.success("Invite sent — check their inbox (and spam).");
      } else {
        toast.success("Invite saved.", { duration: 4500 });
        toast(
          invite_result.email_error ||
            "Email could not be sent — add RESEND_API_KEY and APP_PUBLIC_ORIGIN (your site URL, e.g. http://localhost:3000) in Backend/.env, then restart the server.",
          { icon: "✉️", duration: 9000 }
        );
      }
      set_invite_open(false);
      set_invite_email("");
    } catch (err) {
      toast.error(read_err(err));
    } finally {
      set_invite_busy(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 py-12 text-center text-sm text-stone-500">
        <p>Loading trip…</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-900 shadow-sm">
        <p>{error || "Trip not found."}</p>
        <Link href="/trips" className="mt-3 inline-block font-semibold text-red-800 underline">
          ← My Trips
        </Link>
      </div>
    );
  }

  const status = normalise_trip_status(trip.status);
  const start = parse_trip_date(trip.startDate);
  const end = parse_trip_date(trip.endDate);
  const days =
    start && end ? inclusive_day_count(start, end) : start ? 1 : null;
  const date_range =
    start && end
      ? `${format_trip_day_short(start)} – ${format_trip_day_short(end)}`
      : start
        ? format_trip_day_short(start)
        : "—";
  const members_list: trip_member[] = Array.isArray(trip.members) ? trip.members : [];
  const member_count = members_list.length || (trip.memberUIDs?.length ?? 0);
  const planned_members =
    trip.plannedMemberCount != null && Number.isFinite(Number(trip.plannedMemberCount))
      ? Math.min(99, Math.max(1, Math.floor(Number(trip.plannedMemberCount))))
      : null;
  const members_stat_value =
    planned_members != null ? `${member_count} / ${planned_members}` : String(member_count);
  const budget_label =
    trip.budgetTotal != null && Number.isFinite(Number(trip.budgetTotal))
      ? `${trip.currency || "INR"} ${Number(trip.budgetTotal).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
      : "Not set";
  const cover = trip_cover_image_url(trip.coverPhotoURL, trip.tripId + (trip.destination || ""));
  const is_admin = Boolean(auth_user?.uid && trip.adminUID === auth_user.uid);
  const base = `/trips/${trip_id}`;

  const stat_card = (emoji: string, label: string, value: string) => (
    <div
      key={label}
      className="rounded-2xl border border-stone-200/90 bg-white px-4 py-3 shadow-[0_4px_20px_-4px_rgba(28,31,29,0.08)]"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        <span aria-hidden>{emoji}</span> {label}
      </p>
      <p className="mt-1 font_display text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );

  return (
    <div className="w-full pb-8">
      {/* Hero — aligned with trip layout column */}
      <div className="relative mb-6 min-h-[220px] w-full overflow-hidden rounded-2xl shadow-[0_12px_40px_-16px_rgba(11,22,40,0.22)] sm:mb-8 sm:min-h-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        <div className="relative flex h-full min-h-[220px] flex-col justify-end p-4 pb-5 sm:min-h-[280px] sm:p-6 sm:pb-6">
          <span
            className={`mb-2 w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${status_badge_class(status)}`}
          >
            {trip_status_label(status)}
          </span>
          <h1 className="font_display text-2xl font-semibold leading-tight text-white sm:text-4xl">
            {trip.title || "Trip"}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-white/90 sm:text-base">
            <span aria-hidden>📍</span>
            {trip.destination || "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat_card("📅", "Duration", days != null ? `${days} day${days === 1 ? "" : "s"}` : "—")}
        {stat_card("🗓️", "Dates", date_range)}
        {stat_card("👥", "Members", members_stat_value)}
        {stat_card("💰", "Budget", budget_label)}
      </div>

      {/* Weather */}
      <section className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font_display text-lg font-semibold text-stone-900">Weather</h2>
        {weather_loading ? (
          <p className="mt-3 text-sm text-stone-500">Loading forecast…</p>
        ) : weather ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4 border-b border-stone-100 pb-4">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                  {Math.round(weather.current.temp_c)}°C
                </p>
                <p className="text-sm font-medium text-stone-600">{weather.current.condition_label}</p>
              </div>
              <p className="text-sm text-stone-600">
                Humidity: <span className="font-semibold text-stone-800">{weather.current.humidity_pct}%</span>
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">7-day forecast</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {weather.daily.map((d) => (
                <div
                  key={d.date_iso}
                  className="min-w-[4.5rem] shrink-0 rounded-xl border border-stone-100 bg-stone-50/80 px-2 py-2 text-center"
                >
                  <p className="text-[10px] font-semibold uppercase text-stone-500">
                    {new Date(d.date_iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-600">{d.condition_label}</p>
                  <p className="mt-1 text-xs font-semibold text-stone-900">
                    {Math.round(d.max_c)}° / {Math.round(d.min_c)}°
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-500">Weather unavailable for this destination.</p>
        )}
      </section>

      {/* Members */}
      <section className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font_display text-lg font-semibold text-stone-900">Members</h2>
          {is_admin ? (
            <button
              type="button"
              onClick={() => set_invite_open(true)}
              className="inline-flex w-fit items-center justify-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Invite member
            </button>
          ) : null}
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {members_list.map((m) => {
            const admin = trip.adminUID === m.uid;
            return (
              <li key={m.uid} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 px-3 py-2.5">
                {m.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoURL}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full border border-stone-200 object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-200 text-sm font-semibold text-stone-700">
                    {(m.displayName || "M").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{m.displayName}</span>
                {admin ? (
                  <span className="shrink-0 text-lg" title="Admin" aria-label="Admin">
                    👑
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <h2 className="mb-3 font_display text-lg font-semibold text-stone-900">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: `${base}/itinerary`, emoji: "🗺️", label: "Itinerary" },
            { href: `${base}/expenses`, emoji: "💸", label: "Expenses" },
            { href: `${base}/chat`, emoji: "💬", label: "Chat" },
            { href: `${base}/memories`, emoji: "📸", label: "Memories" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-stone-200/90 bg-white py-4 text-center shadow-sm transition hover:border-[#9c4221]/40 hover:bg-[#9c4221]/5"
            >
              <span className="text-2xl" aria-hidden>
                {a.emoji}
              </span>
              <span className="text-sm font-semibold text-stone-800">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {invite_open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          onClick={() => {
            if (!invite_busy) set_invite_open(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="invite-title" className="font_display text-lg font-semibold text-stone-900">
              Invite member
            </h3>
            <p className="mt-1 text-sm text-stone-600">They will receive an invite by email (join flow).</p>
            <form onSubmit={on_send_invite} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={invite_email}
                onChange={(e) => set_invite_email(e.target.value)}
                placeholder="friend@email.com"
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none ring-stone-900/5 focus:border-[#9c4221]/50 focus:ring-2 focus:ring-[#9c4221]/20"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={invite_busy}
                  className="rounded-full bg-[#9c4221] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7f341a] disabled:opacity-60"
                >
                  {invite_busy ? "Sending…" : "Send invite"}
                </button>
                <button
                  type="button"
                  onClick={() => set_invite_open(false)}
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
