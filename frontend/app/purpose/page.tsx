import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing_page_shell";
import { MarketingFestivalCalendarSection } from "@/components/marketing_festival_calendar_section";

export const metadata: Metadata = {
  title: "Purpose — Yatrify",
  description:
    "Why Yatrify exists: less chat chaos, fair splits, and one place for your crew’s trips—from weekend getaways to reunion holidays.",
};

export default function PurposePage() {
  return (
    <MarketingPageShell wide>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0b1628]/08 bg-gradient-to-br from-white via-white to-[#FF6B4A]/[0.06] p-8 shadow-[0_20px_60px_-24px_rgba(11,22,40,0.2)] sm:p-10 md:p-12">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[100%] bg-[#FF6B4A]/10" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF6B4A]">Purpose</p>
        <h1 className="landing_serif relative mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight text-[#0b1628] sm:text-4xl md:text-[2.35rem]">
          Travel together shouldn’t feel like a group project that never ends.
        </h1>
        <p className="relative mt-6 max-w-2xl text-base leading-relaxed text-[#0b1628]/75 md:text-lg">
          Yatrify exists for friends, families, and small teams who plan in WhatsApp today—and deserve one calm
          workspace tomorrow. We put itineraries, money, context, and memories in the same thread so the trip stays
          exciting, not exhausting.
        </p>
      </div>

      {/* Problem vs answer */}
      <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
        <section className="rounded-2xl border border-[#0b1628]/08 bg-white p-7 shadow-sm sm:p-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b1628]/45">The friction</h2>
          <p className="landing_serif mt-3 text-xl font-semibold text-[#0b1628]">Scattered tools, scattered truth</p>
          <p className="mt-4 text-sm leading-relaxed text-[#0b1628]/70">
            One person’s Google Doc, another’s expense app, a third’s photo roll. Links get lost, numbers don’t
            match, and someone always feels out of the loop. That’s not a people problem—it’s a workflow problem.
          </p>
        </section>
        <section className="rounded-2xl border border-[#FF6B4A]/25 bg-[#0b1628] p-7 text-white shadow-lg sm:p-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B4A]">Our answer</h2>
          <p className="landing_serif mt-3 text-xl font-semibold">One trip. One source of truth.</p>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            A shared trip in Yatrify is the place everyone opens first: the plan, the spend, the weather and
            places that matter, and the moments you capture—structured enough to stay organised, flexible enough
            to feel human.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <MarketingFestivalCalendarSection variant="purpose" />
      </div>

      {/* Pillars */}
      <section className="mt-14">
        <h2 className="landing_serif text-2xl font-semibold text-[#0b1628] md:text-3xl">What we optimise for</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#0b1628]/65 md:text-base">
          Every feature choice ties back to group clarity—so you spend energy on choices that matter, not on
          chasing screenshots.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "○",
              title: "Alignment",
              text: "Everyone sees the same itinerary updates, invite list, and trip context—no “wait, which version?” moments.",
            },
            {
              icon: "◆",
              title: "Fair money",
              text: "Expenses and splits stay visible so settling up feels factual, not personal.",
            },
            {
              icon: "◇",
              title: "Signal, not noise",
              text: "Weather, rates, and place-aware hints sit next to your days—so decisions feel grounded.",
            },
            {
              icon: "◎",
              title: "Memories that stick",
              text: "Photos and captions live with the trip, not buried in a camera roll six months later.",
            },
            {
              icon: "▷",
              title: "Your crew’s style",
              text: "Profile preferences—currency, budget style, interests—help suggestions fit how you actually travel.",
            },
            {
              icon: "✦",
              title: "Room to breathe",
              text: "We favour calm UI and thoughtful defaults over flashing dashboards—trips are emotional enough.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-[#0b1628]/08 bg-white/95 p-6 shadow-sm transition hover:border-[#FF6B4A]/30 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B4A]/15 text-lg text-[#FF6B4A] transition group-hover:bg-[#FF6B4A]/25">
                {item.icon}
              </span>
              <h3 className="landing_serif mt-4 text-lg font-semibold text-[#0b1628]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#0b1628]/68">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who */}
      <section className="mt-16 rounded-3xl border border-[#0b1628]/08 bg-[#0b1628]/[0.03] p-8 md:p-10">
        <h2 className="landing_serif text-xl font-semibold text-[#0b1628] md:text-2xl">Who we build for</h2>
        <ul className="mt-6 space-y-4 text-sm leading-relaxed text-[#0b1628]/75 md:text-base">
          <li className="flex gap-3 border-l-2 border-[#FF6B4A]/60 pl-4">
            <span>
              <strong className="text-[#0b1628]">Weekend crews & reunions</strong> — quick alignment without a
              project manager.
            </span>
          </li>
          <li className="flex gap-3 border-l-2 border-[#FF6B4A]/60 pl-4">
            <span>
              <strong className="text-[#0b1628]">Families across cities</strong> — one trip canvas grandparents
              and cousins can follow.
            </span>
          </li>
          <li className="flex gap-3 border-l-2 border-[#FF6B4A]/60 pl-4">
            <span>
              <strong className="text-[#0b1628]">Small teams off-site</strong> — costs and schedule in one place
              when you’re not at your desks.
            </span>
          </li>
        </ul>
      </section>

      {/* Closing + CTA */}
      <section className="mt-14 flex flex-col items-start gap-6 rounded-3xl bg-gradient-to-br from-[#0b1628] to-[#132842] px-8 py-10 text-white shadow-xl md:flex-row md:items-center md:justify-between md:px-12 md:py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#FF6B4A]">Next step</p>
          <p className="landing_serif mt-2 text-xl font-semibold md:text-2xl">Bring your next trip into focus.</p>
          <p className="mt-2 max-w-md text-sm text-white/75">
            Sign in, create a trip, invite your people—see how much lighter planning feels when it lives in one
            place.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex shrink-0 rounded-full bg-[#FF6B4A] px-8 py-3.5 text-sm font-semibold text-[#0b1628] transition hover:brightness-110"
        >
          Start planning
        </Link>
      </section>

      <p className="mt-10 text-center text-sm text-[#0b1628]/55">
        Curious what’s inside the product?{" "}
        <Link href="/product" className="font-semibold text-[#FF6B4A] underline-offset-2 hover:underline">
          Explore our product overview
        </Link>
      </p>
    </MarketingPageShell>
  );
}
