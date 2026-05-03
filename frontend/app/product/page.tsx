import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing_page_shell";
import { MarketingFestivalCalendarSection } from "@/components/marketing_festival_calendar_section";

export const metadata: Metadata = {
  title: "Our product — Yatrify",
  description:
    "Trips, AI-assisted itineraries, shared expenses, live travel context, and trip memories—how Yatrify works end to end.",
};

export default function ProductPage() {
  return (
    <MarketingPageShell wide>
      <header className="text-center md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF6B4A]">Our product</p>
        <h1 className="landing_serif mx-auto mt-4 max-w-4xl text-3xl font-semibold leading-[1.12] tracking-tight text-[#0b1628] sm:text-4xl md:mx-0 md:text-[2.5rem]">
          One workspace from “where should we go?” to “remember that sunset?”
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-[#0b1628]/72 md:mx-0 md:text-lg">
          Yatrify ties together the messy middle of group travel: planning, money, context on the road, and the
          stories you bring home. Below is how the pieces fit—transparently, without enterprise jargon.
        </p>
      </header>

      {/* Snapshot strip */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { k: "Trips", v: "Create, invite, collaborate", accent: "border-[#FF6B4A]/30" },
          { k: "Money", v: "Track & split fairly", accent: "border-[#0b1628]/15" },
          { k: "Moments", v: "Photos & AI captions", accent: "border-[#FF6B4A]/30" },
        ].map((s) => (
          <div
            key={s.k}
            className={`rounded-2xl border bg-white/95 px-5 py-5 text-center shadow-sm ${s.accent} sm:text-left`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF6B4A]">{s.k}</p>
            <p className="landing_serif mt-2 text-lg font-semibold text-[#0b1628]">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Deep dive blocks */}
      <div className="mt-16 space-y-12">
        {[
          {
            tag: "Trips & people",
            title: "A shared trip everyone can trust",
            body: [
              "Create a trip with dates and destination context, then invite members by email—everyone lands on the same overview.",
              "Roles and membership stay visible so it’s clear who’s in the crew and who’s driving decisions.",
              "Your profile (home currency, budget style, interests) travels with you so recommendations and AI prompts stay relevant.",
            ],
          },
          {
            tag: "Planning & AI",
            title: "Itineraries you can actually edit",
            body: [
              "Build day-by-day structure instead of a blank doc—add stops, notes, and pacing that match your group.",
              "AI-assisted suggestions help you go from a rough idea to a walkable plan; you stay in control of every edit.",
              "Useful for weekend hops or longer loops—same workflow, different tempo.",
            ],
          },
          {
            tag: "Money",
            title: "Expenses without the spreadsheet hangover",
            body: [
              "Log who paid for what and keep splits understandable—especially when multiple people cover meals, cabs, or stays.",
              "See summaries so settling up at the end of the trip feels fair and factual.",
              "Designed for small groups, not corporate procurement—minimum friction, maximum clarity.",
            ],
          },
          {
            tag: "On-trip context",
            title: "Ground truth beside your schedule",
            body: [
              "Weather and rates sit next to your plan so you’re not switching apps mid-street to double-check.",
              "Place-aware hints support better decisions without drowning you in data.",
            ],
          },
          {
            tag: "Memories",
            title: "Photos that stay with the trip",
            body: [
              "Upload images to the trip itself—so the story stays tied to the route you walked.",
              "Optional AI-generated captions help you remember the vibe without writing essays on day three.",
            ],
          },
        ].map((section, i) => (
          <section
            key={section.tag}
            className={`grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-12 ${i === 0 ? "pt-0" : "border-t border-[#0b1628]/08 pt-12 md:pt-14"}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF6B4A]">{section.tag}</p>
              <h2 className="landing_serif mt-3 text-2xl font-semibold text-[#0b1628] md:text-[1.65rem]">
                {section.title}
              </h2>
            </div>
            <ul className="space-y-4 text-sm leading-relaxed text-[#0b1628]/72 md:text-base">
              {section.body.map((line, j) => (
                <li key={`${section.tag}-${j}`} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B4A]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-16">
        <MarketingFestivalCalendarSection variant="product" />
      </div>

      {/* Flow */}
      <section className="mt-16 rounded-3xl border border-[#0b1628]/08 bg-white p-8 shadow-[0_24px_70px_-28px_rgba(11,22,40,0.18)] md:p-10">
        <h2 className="landing_serif text-center text-2xl font-semibold text-[#0b1628] md:text-3xl">
          How a trip typically flows
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3 md:gap-4">
          {[
            { step: "1", title: "Create & invite", desc: "Spin up the trip and bring your people in with a clear home base." },
            { step: "2", title: "Plan & adjust", desc: "Shape the itinerary and expenses together as ideas firm up." },
            { step: "3", title: "Go & capture", desc: "Travel with context at hand and save memories to the same trip." },
          ].map((row) => (
            <li key={row.step} className="relative rounded-2xl bg-[#eef2f9] p-6 text-center md:text-left">
              <span className="landing_serif text-3xl font-bold text-[#FF6B4A]/90">{row.step}</span>
              <p className="landing_serif mt-3 text-lg font-semibold text-[#0b1628]">{row.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#0b1628]/65">{row.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust line */}
      <p className="mt-12 rounded-2xl border border-dashed border-[#0b1628]/15 bg-[#0b1628]/[0.02] px-6 py-5 text-center text-sm leading-relaxed text-[#0b1628]/65">
        Authentication is handled securely via Firebase; trip data is organised per journey so your crew only sees
        what they’re invited to. We’re focused on small-group workflows—not advertising your plans to the world.
      </p>

      <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-[#FF6B4A] to-[#ff8566] px-8 py-10 text-center shadow-lg md:flex-row md:text-left">
        <div>
          <p className="text-sm font-semibold text-[#0b1628]/80">Ready to try the flow?</p>
          <p className="landing_serif mt-1 text-xl font-semibold text-[#0b1628]">Open Yatrify and start a trip.</p>
        </div>
        <Link
          href="/login"
          className="inline-flex rounded-full bg-[#0b1628] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#132038]"
        >
          Get started
        </Link>
      </div>

      <p className="mt-10 text-center text-sm text-[#0b1628]/55">
        Why we built this way —{" "}
        <Link href="/purpose" className="font-semibold text-[#FF6B4A] underline-offset-2 hover:underline">
          Read our purpose
        </Link>
      </p>
    </MarketingPageShell>
  );
}
