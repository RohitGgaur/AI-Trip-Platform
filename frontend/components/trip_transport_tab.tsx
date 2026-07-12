"use client";

import { useCallback, useEffect, useState } from "react";
import { get_firebase_auth } from "@/lib/firebase_client";
import { fetch_transport, type transport_result, type train_entry } from "@/lib/transport_api";
import { fetch_trip } from "@/lib/trips_api";

const coral = "#FF6B4A";

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconTrain({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="13" rx="3" stroke={coral} strokeWidth="1.75" />
      <path d="M4 11h16" stroke={coral} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 16l-2 4M15 16l2 4M8 20h8" stroke={coral} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.5" cy="14.5" r="1" fill={coral} />
      <circle cx="15.5" cy="14.5" r="1" fill={coral} />
    </svg>
  );
}

function IconBus({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2.5" stroke="#6366f1" strokeWidth="1.75" />
      <path d="M3 10h18" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="19.5" r="1.5" stroke="#6366f1" strokeWidth="1.5" />
      <circle cx="16.5" cy="19.5" r="1.5" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M7.5 17v-4M16.5 17v-4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCab({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l2-6h10l2 6" stroke="#f59e0b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="13" width="20" height="6" rx="2.5" stroke="#f59e0b" strokeWidth="1.75" />
      <circle cx="7" cy="20" r="1.5" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="17" cy="20" r="1.5" stroke="#f59e0b" strokeWidth="1.5" />
    </svg>
  );
}

function IconFlight({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 16l-7-5V4a2 2 0 0 0-4 0v7L3 16v2l7-2v3l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-3l7 2v-2Z" stroke="#10b981" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt_inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function fmt_hours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/90 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: color + "18" }}>
          {icon}
        </span>
        <span className="font-semibold text-[#0b1628] text-[15px]">{title}</span>
      </div>
      <div className="divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function Row({ label, sub, price, duration, badge, link, link_label }: {
  label: string; sub?: string; price: string; duration?: string; badge?: string; link?: string; link_label?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[#0b1628] text-[14px]">{label}</span>
          {badge && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="text-[12px] text-stone-500 mt-0.5">{sub}</p>}
        {duration && <p className="text-[12px] text-stone-400 mt-0.5">⏱ {duration}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-bold text-[#0b1628] text-[15px]">{price}</span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: coral }}
          >
            {link_label || "Book"} <IconLink />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Train Card ────────────────────────────────────────────────────────────────
function TrainCard({ train, irctc_link, is_first }: { train: train_entry; irctc_link: string; is_first: boolean }) {

  return (
    <div className="px-5 py-4 space-y-2.5 border-b border-stone-100 last:border-0">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#0b1628] text-[14px]">{train.train_name}</span>
            {is_first && !train.estimated && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                First result
              </span>
            )}
            {train.estimated && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
                Estimated
              </span>
            )}
          </div>
          {train.train_number !== "—" && (
            <p className="text-[12px] text-stone-500 mt-0.5">#{train.train_number}</p>
          )}
        </div>
        <a
          href={irctc_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: coral }}
        >
          Book <IconLink />
        </a>
      </div>

      {/* Timing row */}
      {(train.departure !== "—" || train.arrival !== "—") && (
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-bold text-[#0b1628]">{train.departure}</span>
          <span className="flex-1 border-t border-dashed border-stone-300 relative">
            {train.duration && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-1.5 text-[11px] text-stone-400 whitespace-nowrap">
                {train.duration}
              </span>
            )}
          </span>
          <span className="font-bold text-[#0b1628]">{train.arrival}</span>
        </div>
      )}

      {/* Run days */}
      {Array.isArray(train.run_days) && train.run_days.length > 0 && train.run_days.length < 7 && (
        <p className="text-[11px] text-stone-400">Runs: {train.run_days.join(", ")}</p>
      )}

      {/* Fares per class */}
      {train.classes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {train.classes.map((cls) => (
            <div key={cls} className="rounded-lg bg-stone-50 ring-1 ring-stone-200/80 px-3 py-1.5 text-center">
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide">{cls}</p>
              <p className="text-[13px] font-bold text-[#0b1628]">
                {train.fares[cls] ? fmt_inr(train.fares[cls]) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TripTransportTab({ trip_id }: { trip_id: string }) {
  const [from, set_from] = useState("");
  const [to, set_to] = useState("");
  const [date, set_date] = useState("");
  const [result, set_result] = useState<transport_result | null>(null);
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState<string | null>(null);
  const [trip_loaded, set_trip_loaded] = useState(false);

  // Pre-fill from trip destination
  useEffect(() => {
    async function load() {
      try {
        const auth = get_firebase_auth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const trip = await fetch_trip(token, trip_id);
        if (trip?.destination) set_to(trip.destination);
        if (trip?.startDate) {
          const d = typeof trip.startDate === "string"
            ? trip.startDate.split("T")[0]
            : new Date((trip.startDate as { seconds?: number })?.seconds ? (trip.startDate as { seconds: number }).seconds * 1000 : trip.startDate as number).toISOString().split("T")[0];
          set_date(d);
        }
      } catch {
        // non-critical
      } finally {
        set_trip_loaded(true);
      }
    }
    load();
  }, [trip_id]);

  const search = useCallback(async () => {
    if (!from.trim() || !to.trim()) {
      set_error("Please enter both From and To cities.");
      return;
    }
    set_loading(true);
    set_error(null);
    set_result(null);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in.");
      const token = await user.getIdToken();
      const data = await fetch_transport(token, from.trim(), to.trim(), date || undefined);
      set_result(data);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
        (e instanceof Error ? e.message : "Search failed.");
      set_error(msg);
    } finally {
      set_loading(false);
    }
  }, [from, to, date]);

  return (
    <div className="px-4 py-6 sm:px-6 max-w-3xl mx-auto space-y-6">
      {/* Search card */}
      <div
        className="rounded-2xl border border-white/90 p-5 shadow-[0_8px_32px_-12px_rgba(11,22,40,0.18)] space-y-4"
        style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.97),rgba(246,248,252,0.95))" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-6 rounded-full" style={{ background: coral }} />
          <h2 className="font-bold text-[#0b1628] text-[16px]">Transport Search</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">From</label>
            <input
              value={from}
              onChange={(e) => set_from(e.target.value)}
              placeholder="e.g. Delhi"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[14px] text-[#0b1628] placeholder-stone-400 outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/20 transition"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">To</label>
            <input
              value={to}
              onChange={(e) => set_to(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[14px] text-[#0b1628] placeholder-stone-400 outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/20 transition"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="w-full sm:w-52">
            <label className="block text-[12px] font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Travel Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => set_date(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[14px] text-[#0b1628] outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/20 transition"
            />
          </div>
          <button
            onClick={search}
            disabled={loading || !trip_loaded}
            className="w-full sm:w-auto rounded-xl px-6 py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${coral}, #e8562e)` }}
          >
            {loading ? "Searching…" : "Search Transport"}
          </button>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700 ring-1 ring-red-200">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[#0b1628]/[0.04] px-4 py-3 text-[13px]">
            <span className="font-semibold text-[#0b1628]">{result.from} → {result.to}</span>
            <span className="text-stone-500">·</span>
            <span className="text-stone-600">Road ~{result.road_km} km</span>
            <span className="text-stone-500">·</span>
            <span className="text-stone-600">Aerial {result.aerial_km} km</span>
          </div>

          {/* Trains */}
          <Section
            icon={<IconTrain />}
            title={
              result.trains.source === "irctc"
                ? `Train · ${result.trains.from_code} → ${result.trains.to_code}${result.trains.total ? ` (${result.trains.total} trains)` : ""}`
                : "Train (Estimated)"
            }
            color={coral}
          >
            {result.trains.source === "irctc" && (
              <p className="px-5 py-2 text-[11px] text-emerald-700 bg-emerald-50/60 border-b border-stone-100 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live data from IRCTC · Fares are estimates (IR 2023-24 rates)
              </p>
            )}
            {result.trains.note && (
              <p className="px-5 py-2.5 text-[12px] text-amber-700 bg-amber-50/70 border-b border-stone-100">
                ⚡ {result.trains.note}
              </p>
            )}
            {result.trains.trains.map((t: train_entry, i: number) => (
              <TrainCard key={i} train={t} irctc_link={result.booking_links.irctc} is_first={i === 0} />
            ))}
          </Section>

          {/* Flights */}
          <Section icon={<IconFlight />} title="Flight" color="#10b981">
            {result.flights.source === "estimated" && result.flights.note && (
              <p className="px-5 py-2.5 text-[12px] text-stone-500 bg-amber-50/60 border-b border-stone-100">
                ⚡ {result.flights.note}
              </p>
            )}
            {result.flights.offers.map((f, i) => (
              <Row
                key={i}
                label={f.airline}
                sub={[
                  f.cabin,
                  f.stops === 0 ? "Non-stop" : `${f.stops} stop`,
                  f.note,
                ].filter(Boolean).join(" · ")}
                duration={f.duration}
                price={fmt_inr(f.fare)}
                badge={i === 0 ? "Best fare" : undefined}
                link={`https://www.goibibo.com/flights/search/?from=${result.flights.origin || result.from}&to=${result.flights.destination || result.to}&date=${result.date}&class=E&pax=1`}
                link_label="Search"
              />
            ))}
          </Section>

          {/* Buses */}
          <Section icon={<IconBus />} title="Bus" color="#6366f1">
            {result.buses.map((b, i) => (
              <Row
                key={i}
                label={b.type}
                sub={b.note}
                price={fmt_inr(b.fare)}
                duration={fmt_hours(b.duration_h)}
                badge={i === 0 ? "Budget" : undefined}
                link={result.booking_links.redbus}
                link_label="RedBus"
              />
            ))}
          </Section>

          {/* Cabs */}
          <Section icon={<IconCab />} title="Cab (Outstation)" color="#f59e0b">
            {result.cabs.map((c, i) => (
              <Row
                key={i}
                label={c.type}
                sub={c.note + " · one-way total fare"}
                price={fmt_inr(c.fare)}
                duration={fmt_hours(c.duration_h)}
                link={result.booking_links.uber}
                link_label="Uber"
              />
            ))}
            <div className="px-5 py-2.5">
              <a
                href={result.booking_links.ola}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-medium text-stone-500 hover:text-[#0b1628] underline underline-offset-2"
              >
                Also check Ola Outstation →
              </a>
            </div>
          </Section>

          <p className="text-center text-[11px] text-stone-400">
            Train & bus fares are estimates based on Indian Railways / road transport pricing. Flight fares{" "}
            {result.flights.source === "amadeus" ? "via Amadeus (live sandbox data)" : "are estimated"}.
            Always verify on booking platforms before purchasing.
          </p>
        </>
      )}
    </div>
  );
}
