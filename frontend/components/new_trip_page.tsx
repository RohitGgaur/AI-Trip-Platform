"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { create_trip, type budget_style_type } from "@/lib/trips_api";
import { get_firebase_auth } from "@/lib/firebase_client";

const coral = "#FF6B4A";

const input_class =
  "mt-2 w-full max-w-xl rounded-xl border border-stone-200/90 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#FF6B4A]/45 focus:ring-2 focus:ring-[#FF6B4A]/18";

const label_class = "text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500";

const section_wrap = "border-t border-stone-200/70 pt-10 first:border-t-0 first:pt-0";

const section_title = "font_display text-xl font-semibold text-[#0b1628]";

function read_api_error(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.error?.message;
    if (typeof msg === "string") return msg;
    if (!err.response && err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Could not create trip.";
}

export function NewTripPage() {
  const router = useRouter();
  const [busy, set_busy] = useState(false);
  const [title, set_title] = useState("");
  const [destination, set_destination] = useState("");
  const [start_date, set_start_date] = useState("");
  const [end_date, set_end_date] = useState("");
  const [planned_member_count, set_planned_member_count] = useState<string>("2");
  const [currency, set_currency] = useState("INR");
  const [budget_raw, set_budget_raw] = useState("");
  const [budget_style, set_budget_style] = useState<budget_style_type>("mid_range");
  const [is_public, set_is_public] = useState(false);

  const on_submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!title.trim() || title.trim().length < 2) {
      toast.error("Trip name should be at least 2 characters.");
      return;
    }
    if (!destination.trim() || destination.trim().length < 2) {
      toast.error("Enter a destination (at least 2 characters).");
      return;
    }
    if (!start_date || !end_date) {
      toast.error("Choose start and end dates.");
      return;
    }
    if (new Date(end_date) < new Date(start_date)) {
      toast.error("End date must be on or after start date.");
      return;
    }

    const planned_n = Number(planned_member_count);
    if (!Number.isFinite(planned_n) || planned_n < 1 || planned_n > 99 || !Number.isInteger(planned_n)) {
      toast.error("Group size must be a whole number between 1 and 99.");
      return;
    }

    const budget_trim = budget_raw.trim();
    let budget_total: number | undefined;
    if (budget_trim !== "") {
      const n = Number(budget_trim);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error("Budget must be a positive number, or leave empty.");
        return;
      }
      budget_total = n;
    }

    set_busy(true);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) {
        toast.error("Sign in again.");
        router.replace("/login");
        return;
      }
      const id_token = await user.getIdToken();
      const payload = {
        title: title.trim(),
        destination: destination.trim(),
        startDate: start_date,
        endDate: end_date,
        currency: currency.trim().toUpperCase() || "INR",
        budgetStyle: budget_style,
        isPublic: is_public,
        plannedMemberCount: planned_n,
        ...(budget_total !== undefined ? { budgetTotal: budget_total } : {}),
      };
      const { tripId } = await create_trip(id_token, payload);
      toast.success("Trip created.");
      router.push(`/trips/${tripId}`);
      router.refresh();
    } catch (err) {
      toast.error(read_api_error(err));
    } finally {
      set_busy(false);
    }
  };

  const radio_wrap =
    "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-stone-200/90 bg-white px-3.5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-300 has-[:checked]:border-[#FF6B4A]/45 has-[:checked]:bg-[#FF6B4A]/[0.06] sm:min-w-0";

  return (
    <div className="relative mx-auto w-full max-w-3xl pb-16">
      <div
        className="pointer-events-none absolute -left-16 top-0 hidden h-40 w-40 rounded-full bg-[#FF6B4A]/[0.07] blur-3xl md:block"
        aria-hidden
      />

      {/* Page header — full bleed on column, no card */}
      <header className="relative pb-10">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 transition hover:text-[#FF6B4A]"
        >
          <span aria-hidden>←</span> My trips
        </Link>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: coral }}>
          New journey
        </p>
        <h1 className="font_display mt-2 text-3xl font-semibold leading-tight tracking-tight text-[#0b1628] sm:text-4xl">
          Create a trip
        </h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-stone-600">
          Add the basics, how many people you&apos;re planning for, dates and budget—then open the trip and invite
          your crew.
        </p>
        <div
          className="mt-8 h-px w-full max-w-md"
          style={{ background: `linear-gradient(90deg, ${coral} 0%, rgba(11,22,40,0.15) 100%)` }}
          aria-hidden
        />
      </header>

      <form onSubmit={on_submit} className="relative">
        <section className={section_wrap}>
          <h2 className={section_title}>Basics</h2>
          <p className="mt-1 text-sm text-stone-600">What are you calling this trip, and where are you going?</p>
          <div className="mt-6 flex max-w-xl flex-col gap-6">
            <div>
              <label htmlFor="trip_title" className={label_class}>
                Trip name
              </label>
              <input
                id="trip_title"
                type="text"
                autoComplete="off"
                className={input_class}
                value={title}
                onChange={(e) => set_title(e.target.value)}
                placeholder="e.g. Monsoon in Munnar"
                maxLength={100}
                required
                minLength={2}
              />
            </div>
            <div>
              <label htmlFor="trip_destination" className={label_class}>
                Destination
              </label>
              <input
                id="trip_destination"
                type="text"
                autoComplete="off"
                className={input_class}
                value={destination}
                onChange={(e) => set_destination(e.target.value)}
                placeholder="City, region, or country"
                maxLength={200}
                required
                minLength={2}
              />
            </div>
          </div>
        </section>

        <section className={section_wrap}>
          <h2 className={section_title}>When</h2>
          <p className="mt-1 text-sm text-stone-600">Trip window—change later if plans shift.</p>
          <div className="mt-6 grid max-w-xl grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="trip_start" className={label_class}>
                Start date
              </label>
              <input
                id="trip_start"
                type="date"
                className={input_class}
                value={start_date}
                onChange={(e) => set_start_date(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="trip_end" className={label_class}>
                End date
              </label>
              <input
                id="trip_end"
                type="date"
                className={input_class}
                value={end_date}
                onChange={(e) => set_end_date(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className={section_wrap}>
          <h2 className={section_title}>Group size</h2>
          <p className="mt-1 text-sm text-stone-600">
            Including you—rough headcount helps planning and splits. You can still invite more or fewer later.
          </p>
          <div className="mt-6 max-w-xs">
            <label htmlFor="trip_planned_members" className={label_class}>
              People (planned)
            </label>
            <input
              id="trip_planned_members"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              step={1}
              className={input_class}
              value={planned_member_count}
              onChange={(e) => set_planned_member_count(e.target.value)}
              required
            />
          </div>
        </section>

        <section className={section_wrap}>
          <h2 className={section_title}>Budget</h2>
          <p className="mt-1 text-sm text-stone-600">Currency, optional total, and the vibe you want.</p>
          <div className="mt-6 flex max-w-xl flex-col gap-6">
            <div>
              <label htmlFor="trip_currency" className={label_class}>
                Currency
              </label>
              <select
                id="trip_currency"
                className={`${input_class} cursor-pointer`}
                value={currency}
                onChange={(e) => set_currency(e.target.value)}
              >
                <option value="INR">INR — Indian rupee</option>
                <option value="USD">USD — US dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British pound</option>
                <option value="AED">AED — UAE dirham</option>
              </select>
            </div>

            <div>
              <label htmlFor="trip_budget" className={label_class}>
                Total budget <span className="font-normal normal-case tracking-normal text-stone-400">(optional)</span>
              </label>
              <input
                id="trip_budget"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                className={input_class}
                value={budget_raw}
                onChange={(e) => set_budget_raw(e.target.value)}
                placeholder="Leave empty if unsure"
              />
            </div>

            <div>
              <p className={label_class}>Travel style</p>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">Used for AI itinerary hints and recommendations.</p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <label className={radio_wrap}>
                  <input
                    type="radio"
                    name="budget_style"
                    checked={budget_style === "backpacker"}
                    onChange={() => set_budget_style("backpacker")}
                    className="h-4 w-4 border-stone-300 text-[#FF6B4A] focus:ring-[#FF6B4A]"
                  />
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden>🎒</span> Backpacker
                    </span>
                    <span className="text-[11px] font-normal text-stone-500">Lean &amp; local</span>
                  </span>
                </label>
                <label className={radio_wrap}>
                  <input
                    type="radio"
                    name="budget_style"
                    checked={budget_style === "mid_range"}
                    onChange={() => set_budget_style("mid_range")}
                    className="h-4 w-4 border-stone-300 text-[#FF6B4A] focus:ring-[#FF6B4A]"
                  />
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden>✨</span> Mid-range
                    </span>
                    <span className="text-[11px] font-normal text-stone-500">Comfort + value</span>
                  </span>
                </label>
                <label className={radio_wrap}>
                  <input
                    type="radio"
                    name="budget_style"
                    checked={budget_style === "luxury"}
                    onChange={() => set_budget_style("luxury")}
                    className="h-4 w-4 border-stone-300 text-[#FF6B4A] focus:ring-[#FF6B4A]"
                  />
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden>💎</span> Luxury
                    </span>
                    <span className="text-[11px] font-normal text-stone-500">Premium pace</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className={`${section_wrap} max-w-xl`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0b1628]">Public trip</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Others can see basic trip info (read-only). Invites still control who joins.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={is_public}
              onClick={() => set_is_public((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                is_public ? "bg-[#FF6B4A] shadow-[0_2px_8px_-2px_rgba(255,107,74,0.45)]" : "bg-stone-300"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition ${
                  is_public ? "left-7" : "left-1"
                }`}
              />
              <span className="sr-only">{is_public ? "Public" : "Private"}</span>
            </button>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 border-t border-stone-200/80 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[48px] min-w-[10rem] items-center justify-center rounded-full bg-gradient-to-r from-[#ff7a5c] to-[#ff5340] px-8 py-3 text-sm font-semibold text-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_12px_36px_-12px_rgba(255,83,64,0.5)] transition hover:brightness-[1.03] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create trip"}
          </button>
          <Link
            href="/trips"
            className="inline-flex min-h-[48px] items-center justify-center text-sm font-semibold text-stone-600 underline-offset-4 hover:text-[#0b1628] hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
