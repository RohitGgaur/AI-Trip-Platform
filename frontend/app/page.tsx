import Link from "next/link";
import { LandingHeroActions } from "@/components/landing_hero_actions";
import { LandingExploreIndia } from "@/components/landing_explore_india";
import { MarketingFestivalCalendarSection } from "@/components/marketing_festival_calendar_section";
import { LandingFooter } from "@/components/landing_footer";
import { LandingReveal } from "@/components/landing_reveal";
import { LandingTajBanner } from "@/components/landing_taj_banner";

const accent = "#FF6B4A";
const navy = "#0b1628";

export default function Home() {
  return (
    <div className="landing_sans flex flex-1 flex-col">
      {/* Hero — full viewport video */}
      <section className="relative min-h-[100dvh] w-full overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src="/images/video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#0b1628]/50" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0b1628] via-[#0b1628]/35 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1628]/90 via-transparent to-[#0b1628]/40" aria-hidden />

        <div className="relative z-10 flex min-h-[100dvh] flex-col justify-center px-4 pb-28 pt-28 sm:px-8 md:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-4xl">
            <p
              className="landing_hero_line landing_serif text-xs font-semibold uppercase tracking-[0.35em] text-[#FF6B4A] sm:text-sm"
              style={{ color: accent }}
            >
              Travel, together
            </p>
            <h1 className="landing_serif landing_hero_line landing_hero_delay_1 mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.5rem]">
              Plan less chaos.
              <span className="block text-white/95">Feel more journey.</span>
            </h1>
            <p className="landing_hero_line landing_hero_delay_2 mt-8 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl">
              <strong className="font-semibold text-white">Yatrify</strong> is a group travel hub: one place to
              plan the route, split costs fairly, see weather &amp; places beside your days, and save trip
              photos—so your crew stops juggling chats, sheets, and five different apps.
            </p>
            <LandingHeroActions />
            <p className="landing_hero_line landing_hero_delay_4 mt-14 text-xs font-medium uppercase tracking-[0.28em] text-white/40">
              Scroll to discover
            </p>
          </div>
        </div>
      </section>

      {/* Marketing: clear “what this site does” */}
      <section
        id="what"
        className="scroll-mt-24 border-b border-[#0b1628]/08 bg-[#f4f6fa] px-4 py-20 text-[#0b1628] sm:px-6 md:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <LandingReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
              What Yatrify is
            </p>
            <h2 className="landing_serif mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
              Everything your trip needs in one workspace—not scattered across DMs and docs.
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-[#0b1628]/72 md:text-lg">
              Sign in, create a trip, and invite your people. You&apos;ll build and edit an itinerary together,
              track shared expenses, check weather and useful context for your destinations, and upload
              memories from the road. It&apos;s built for small groups—friends, families, or teams—who want less
              coordination stress and more time actually traveling.
            </p>
          </LandingReveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🧭",
                title: "Shared trips & invites",
                text: "One trip everyone can open—same dates, plan, and updates for the whole crew.",
              },
              {
                icon: "✨",
                title: "Smarter planning help",
                text: "AI-assisted itineraries and ideas tailored to your destination, pace, and budget style.",
              },
              {
                icon: "💸",
                title: "Fair expense tracking",
                text: "Log spends and see who owes whom—without turning the holiday into accounting homework.",
              },
              {
                icon: "🌤️",
                title: "Live travel context",
                text: "Weather, rates, and place-aware hints next to your schedule so decisions feel grounded.",
              },
              {
                icon: "📸",
                title: "Trip memories",
                text: "Upload photos to your trip; optional AI captions keep moments tied to where you were.",
              },
              {
                icon: "👥",
                title: "Built for groups",
                text: "Profile, currency, and interests travel with you—so recommendations fit your crew.",
              },
            ].map((item, i) => (
              <LandingReveal key={item.title} delay_ms={i * 55}>
                <article className="h-full rounded-2xl border border-[#0b1628]/10 bg-white p-6 shadow-sm transition hover:border-[#FF6B4A]/25 hover:shadow-md">
                  <span className="text-2xl" aria-hidden>
                    {item.icon}
                  </span>
                  <h3 className="landing_serif mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#0b1628]/68">{item.text}</p>
                </article>
              </LandingReveal>
            ))}
          </div>

          <LandingReveal className="mt-14">
            <div
              className="rounded-2xl border border-[#0b1628]/10 px-6 py-8 md:flex md:items-center md:justify-between md:gap-8 md:px-10"
              style={{ background: `linear-gradient(135deg, rgba(11,22,40,0.04) 0%, rgba(255,107,74,0.06) 100%)` }}
            >
              <div>
                <p className="landing_serif text-lg font-semibold md:text-xl">Who it&apos;s for</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0b1628]/70">
                  Weekends away with friends, family holidays, reunion trips, or any small group that plans in
                  a circle chat today—and deserves one calm place to agree, pay, and remember tomorrow.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex shrink-0 items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-white transition hover:brightness-110 md:mt-0"
                style={{ backgroundColor: accent }}
              >
                Try Yatrify
              </Link>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Taj spotlight — own section (not part of full-bleed video hero) */}
      <LandingTajBanner />

      <LandingExploreIndia />

      <MarketingFestivalCalendarSection variant="home" />

      {/* About */}
      <section id="about" className="scroll-mt-24 border-t border-white/10 bg-[#0b1628] px-4 py-20 text-white sm:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <LandingReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
              Why Yatrify
            </p>
            <h2 className="landing_serif mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              One thread for the whole trip—not six apps and a spreadsheet.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              Weather, money, maps, and plans stay beside each other so your group decides faster and travels
              lighter.
            </p>
          </LandingReveal>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Built for groups",
                body: "Roles, invites, and shared context—without losing the plot.",
              },
              {
                title: "Grounded in real data",
                body: "Rates, places, and timing so choices feel informed.",
              },
              {
                title: "Memories included",
                body: "Photos and captions that belong to the trip, not your camera roll chaos.",
              },
            ].map((card, i) => (
              <LandingReveal key={card.title} delay_ms={i * 90}>
                <article className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm transition hover:border-[#FF6B4A]/35">
                  <div
                    className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-[#0b1628]"
                    style={{ backgroundColor: accent }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="landing_serif text-xl font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{card.body}</p>
                </article>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-24 border-y border-[#0b1628]/08 bg-[#f4f6fa] px-4 py-20 text-[#0b1628] sm:px-6 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <LandingReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
              Product
            </p>
            <h2 className="landing_serif mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Premium tooling that stays out of your way.
            </h2>
          </LandingReveal>

          <div className="mt-16 grid gap-5 lg:grid-cols-2">
            <LandingReveal className="lg:row-span-2">
              <article
                className="flex h-full min-h-[280px] flex-col justify-between rounded-3xl p-10 text-white shadow-xl shadow-[#0b1628]/20"
                style={{ backgroundColor: navy }}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B4A]">
                    Itineraries
                  </p>
                  <h3 className="landing_serif mt-4 text-2xl font-semibold md:text-3xl">
                    From a rough idea to days you can walk.
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                    Describe pace and must-sees; get a structured plan you can edit and share—without a blank
                    doc staring back.
                  </p>
                </div>
                <p className="mt-10 text-xs font-medium text-white/45">AI-assisted, human-controlled.</p>
              </article>
            </LandingReveal>

            <LandingReveal delay_ms={80}>
              <article className="rounded-3xl border border-[#0b1628]/10 bg-white p-8 shadow-sm">
                <h3 className="landing_serif text-xl font-semibold">Live context</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#0b1628]/65">
                  Weather and rates beside your schedule—decisions stay on the ground, not in theory.
                </p>
              </article>
            </LandingReveal>

            <LandingReveal delay_ms={140}>
              <article className="rounded-3xl border border-[#0b1628]/10 bg-white p-8 shadow-sm">
                <h3 className="landing_serif text-xl font-semibold">Trips & expenses</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#0b1628]/65">
                  Split costs and track spend so the group stays fair without the spreadsheet fatigue.
                </p>
              </article>
            </LandingReveal>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-24" style={{ backgroundColor: navy }}>
        <div className="mx-auto max-w-6xl text-white">
          <LandingReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
              How it works
            </p>
            <h2 className="landing_serif mt-4 max-w-xl text-3xl font-semibold md:text-4xl">
              Three calm steps to a trip your crew can follow.
            </h2>
          </LandingReveal>

          <ol className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Create & invite", desc: "Spin up a trip and bring your people in securely." },
              { step: "02", title: "Plan together", desc: "Itinerary, costs, and chat live in one workspace." },
              { step: "03", title: "Go & capture", desc: "Stay synced on the road and save memories in place." },
            ].map((item, i) => (
              <LandingReveal key={item.step} delay_ms={i * 100}>
                <li className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-8">
                  <span className="landing_serif text-4xl font-bold text-[#FF6B4A]/90">{item.step}</span>
                  <h3 className="landing_serif mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.desc}</p>
                </li>
              </LandingReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-24">
        <LandingReveal>
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] shadow-2xl shadow-[#0b1628]/25">
            <div
              className="flex flex-col items-start gap-6 px-8 py-12 md:flex-row md:items-center md:justify-between md:px-14 md:py-16"
              style={{
                background: `linear-gradient(135deg, ${navy} 0%, #132038 45%, #1a2d4a 100%)`,
              }}
            >
              <div className="text-white">
                <h2 className="landing_serif text-2xl font-semibold md:text-3xl">Ready when your crew is.</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                  Sign in and start a trip in minutes—keep everyone on the same beautiful map.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-full px-10 py-3.5 text-sm font-semibold text-[#0b1628] transition hover:brightness-105"
                style={{ backgroundColor: accent }}
              >
                Get started
              </Link>
            </div>
          </div>
        </LandingReveal>
      </section>

      <LandingFooter />
    </div>
  );
}
