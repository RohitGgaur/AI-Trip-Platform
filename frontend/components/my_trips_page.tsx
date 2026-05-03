"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { fetch_trips_list, type trip_list_item } from "@/lib/trips_api";
import {
  inclusive_day_count,
  normalise_trip_status,
  parse_trip_date,
  trip_cover_image_url,
  trip_status_label,
  type trip_status_ui,
} from "@/lib/trip_utils";
import { get_firebase_auth } from "@/lib/firebase_client";

type filter_key = "all" | trip_status_ui;

const filters: { key: filter_key; label: string }[] = [
  { key: "all", label: "All" },
  { key: "planning", label: "Planning" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
];

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function status_badge_class(status: trip_status_ui): string {
  if (status === "planning")
    return "bg-amber-100/90 text-amber-950 shadow-sm ring-1 ring-amber-200/70 backdrop-blur-md";
  if (status === "ongoing")
    return "bg-emerald-100/90 text-emerald-950 shadow-sm ring-1 ring-emerald-200/70 backdrop-blur-md";
  return "bg-white/92 text-[#0b1628] shadow-sm ring-1 ring-white/60 backdrop-blur-md";
}

function TripCard({ trip }: { trip: trip_list_item }) {
  const status = normalise_trip_status(trip.status);
  const start = parse_trip_date(trip.startDate);
  const end = parse_trip_date(trip.endDate);
  const days =
    start && end ? inclusive_day_count(start, end) : start ? 1 : "—";
  const members = Array.isArray(trip.memberUIDs) ? trip.memberUIDs.length : 0;
  const cover = trip_cover_image_url(trip.coverPhotoURL, trip.tripId + (trip.destination || ""));
  const date_label =
    start != null
      ? start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—";

  return (
    <Link
      href={`/trips/${trip.tripId}`}
      className="group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-white/90 bg-white shadow-[0_2px_0_0_rgba(11,22,40,0.03),0_18px_50px_-28px_rgba(11,22,40,0.28),0_8px_24px_-12px_rgba(11,22,40,0.1)] ring-1 ring-[#0b1628]/[0.05] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_0_0_rgba(255,107,74,0.12),0_28px_64px_-24px_rgba(11,22,40,0.35),0_12px_32px_-14px_rgba(255,107,74,0.12)] hover:ring-[#FF6B4A]/25"
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-gradient-to-br from-[#e4e9f2] to-[#dce3ef]">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote Unsplash / API URLs */}
        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.045]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1628]/55 via-[#0b1628]/10 to-transparent opacity-95" />
        <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${status_badge_class(status)}`}
          >
            {trip_status_label(status)}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex translate-y-1 items-center justify-between px-4 pb-3 pt-10 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="text-[13px] font-medium text-white/95 drop-shadow-sm">View trip</span>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            →
          </span>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        <div className="pointer-events-none absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-[#0b1628]/10 to-transparent" />
        <h2 className="font_display text-[1.125rem] font-semibold leading-snug tracking-tight text-[#0b1628] line-clamp-2 group-hover:text-[#132038]">
          {trip.title || "Untitled trip"}
        </h2>
        <p className="flex items-start gap-2.5 text-[0.875rem] leading-relaxed text-stone-500">
          <PinIcon className="mt-0.5 shrink-0 text-[#FF6B4A] opacity-90" />
          <span className="line-clamp-2">{trip.destination || "—"}</span>
        </p>
        <dl className="mt-1 flex divide-x divide-[#0b1628]/[0.08] rounded-2xl bg-[#f6f7fb] px-1 py-3.5 text-[11px] text-stone-500">
          <div className="flex flex-1 flex-col items-center px-2 text-center">
            <dt className="font-semibold uppercase tracking-[0.14em] text-stone-400">Start</dt>
            <dd className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#0b1628]">{date_label}</dd>
          </div>
          <div className="flex flex-1 flex-col items-center px-2 text-center">
            <dt className="font-semibold uppercase tracking-[0.14em] text-stone-400">Members</dt>
            <dd className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#0b1628]">{members}</dd>
          </div>
          <div className="flex flex-1 flex-col items-center px-2 text-center">
            <dt className="font-semibold uppercase tracking-[0.14em] text-stone-400">Days</dt>
            <dd className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#0b1628]">{days}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

export function MyTripsPage() {
  const [filter, set_filter] = useState<filter_key>("all");
  const [trips, set_trips] = useState<trip_list_item[]>([]);
  const [loading, set_loading] = useState(true);
  const [error_message, set_error_message] = useState<string | null>(null);

  const load_trips = useCallback(async () => {
    set_loading(true);
    set_error_message(null);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) {
        set_trips([]);
        set_loading(false);
        return;
      }
      const id_token = await user.getIdToken();
      const status_param = filter === "all" ? undefined : filter;
      const list = await fetch_trips_list(id_token, status_param);
      set_trips(list);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg = e.response?.data?.error?.message;
        set_error_message(typeof msg === "string" ? msg : e.message || "Could not load trips.");
      } else {
        set_error_message("Could not load trips.");
      }
      set_trips([]);
    } finally {
      set_loading(false);
    }
  }, [filter]);

  useEffect(() => {
    load_trips();
  }, [load_trips]);

  const tab_btn =
    "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2.5 sm:text-[15px]";

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div
        className="pointer-events-none absolute -left-24 top-0 hidden h-64 w-64 rounded-full bg-[#FF6B4A]/[0.07] blur-3xl md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-32 hidden h-48 w-48 rounded-full bg-[#0b1628]/[0.06] blur-3xl lg:block"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex gap-4 sm:gap-5">
          <div
            className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-[#FF6B4A] via-[#FF6B4A]/60 to-[#0b1628]/25 sm:block"
            aria-hidden
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#FF6B4A]">
              Your journeys
            </p>
            <h1 className="font_display mt-2 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#0b1628] sm:text-[2.35rem]">
              <span className="font-normal text-stone-400">My</span> trips
            </h1>
            <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-stone-500">
              Curate adventures, keep everyone aligned, and open any trip in a tap.
            </p>
          </div>
        </div>
        <Link
          href="/trips/new"
          className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a5c] to-[#ff5340] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_10px_36px_-10px_rgba(255,83,64,0.55)] transition hover:brightness-[1.03] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.28)_inset,0_14px_40px_-8px_rgba(255,83,64,0.5)] active:scale-[0.98] sm:px-7"
        >
          <span className="text-lg leading-none">+</span>
          New trip
        </Link>
      </div>

      <div
        className="relative mt-10 inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-[#0b1628]/[0.045] p-1.5 ring-1 ring-[#0b1628]/[0.06]"
        role="tablist"
        aria-label="Filter trips by status"
      >
        {filters.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${tab_btn} ${
                active
                  ? "bg-white text-[#0b1628] shadow-[0_2px_8px_-2px_rgba(11,22,40,0.12)] ring-1 ring-[#0b1628]/[0.06]"
                  : "text-stone-500 hover:bg-white/60 hover:text-[#0b1628]"
              }`}
              onClick={() => set_filter(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error_message ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p>{error_message}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-red-800 underline hover:no-underline"
            onClick={() => load_trips()}
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-md ring-1 ring-[#0b1628]/[0.04]"
            >
              <div className="aspect-[16/10] animate-pulse bg-[#e8ecf4]" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-[75%] animate-pulse rounded-lg bg-stone-200" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-stone-100" />
                <div className="h-14 animate-pulse rounded-2xl bg-[#f4f6fb]" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 && !error_message ? (
        <div className="mx-auto mt-20 flex max-w-md flex-col items-center rounded-[1.35rem] border border-white/80 bg-white/90 px-8 py-14 text-center shadow-[0_24px_64px_-32px_rgba(11,22,40,0.35)] ring-1 ring-[#0b1628]/[0.05] backdrop-blur-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a5c]/20 to-[#0b1628]/10 text-2xl">
            ✦
          </div>
          <p className="font_display text-xl font-semibold text-[#0b1628]">Your map is ready</p>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            Add a trip to set dates, invite friends, and collect memories in one calm place.
          </p>
          <Link
            href="/trips/new"
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a5c] to-[#ff5340] px-7 py-2.5 text-sm font-semibold text-white shadow-[0_10px_36px_-10px_rgba(255,83,64,0.55)] transition hover:brightness-[1.03] active:scale-[0.98]"
          >
            <span className="text-lg leading-none">+</span>
            Create trip
          </Link>
        </div>
      ) : !error_message ? (
        <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-9">
          {trips.map((trip) => (
            <TripCard key={trip.tripId} trip={trip} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
