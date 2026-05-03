import Image from "next/image";
import Link from "next/link";

const accent = "#FF6B4A";

const stat_blocks = [
  { value: "1000+", label: "Trips planned" },
  { value: "50+", label: "Destinations" },
  { value: "4.9", label: "User rating" },
];

/** Separate landing block (not the full-bleed video hero): Taj card on a light section shell. */
export function LandingTajBanner() {
  return (
    <section
      id="india-journey"
      aria-labelledby="india-journey-heading"
      className="landing_sans scroll-mt-24 border-y border-[#0b1628]/06 bg-[#e9eef6] px-4 py-14 sm:px-6 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center md:mb-10 md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
            India spotlight
          </p>
          <p id="india-journey-heading" className="sr-only">
            Your perfect India journey awaits — featured banner
          </p>
        </div>

        <div className="relative min-h-[380px] overflow-hidden rounded-[28px] border border-[#0b1628]/12 shadow-2xl shadow-[#0b1628]/25 sm:min-h-[400px] sm:rounded-[32px] lg:min-h-[420px]">
          <Image
            src="/images/tajmahal.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 1152px"
            priority
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[#0b1628]/45"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b1628]/92 via-[#0b1628]/65 to-[#0b1628]/35 sm:via-[#0b1628]/55"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1628]/80 to-transparent sm:bg-gradient-to-br sm:from-[#0b1628]/50 sm:to-transparent"
            aria-hidden
          />

          <div className="relative z-10 flex min-h-[380px] flex-col justify-center gap-10 p-6 sm:min-h-[400px] sm:p-8 md:p-10 lg:min-h-[420px] lg:flex-row lg:items-center lg:gap-12 lg:p-12 xl:p-14">
            {/* Left — copy + CTA */}
            <div className="flex max-w-xl flex-1 flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <span className="text-[#FF6B4A]" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                  </svg>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  AI-powered
                </span>
              </div>

              <h2 className="landing_serif mt-6 text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.35rem] lg:text-[2.65rem]">
                Your Perfect India Journey{" "}
                <span style={{ color: accent }} className="font-semibold">
                  Awaits
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/88 md:text-lg">
                From hidden gems to iconic landmarks — create personalized itineraries in minutes and discover
                India your way.
              </p>

              <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                <Link
                  href="/login"
                  className="inline-flex min-h-[52px] w-fit items-center justify-center rounded-full px-10 text-sm font-semibold text-[#0b1628] shadow-lg shadow-black/30 transition hover:brightness-110"
                  style={{ backgroundColor: accent }}
                >
                  Start planning free
                </Link>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2.5" aria-hidden>
                    <span className="inline-block h-10 w-10 rounded-full border-2 border-[#0b1628] bg-gradient-to-br from-amber-300 to-orange-600" />
                    <span className="inline-block h-10 w-10 rounded-full border-2 border-[#0b1628] bg-gradient-to-br from-sky-400 to-indigo-600" />
                    <span className="inline-block h-10 w-10 rounded-full border-2 border-[#0b1628] bg-gradient-to-br from-emerald-400 to-teal-700" />
                  </div>
                  <span className="text-sm font-medium text-white/80">Loved by travellers</span>
                </div>
              </div>
            </div>

            {/* Right — glass stats */}
            <div className="flex w-full flex-col gap-3 lg:ml-auto lg:max-w-[280px] lg:shrink-0">
              {stat_blocks.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/25 bg-white/[0.12] px-6 py-5 shadow-lg backdrop-blur-md transition hover:bg-white/[0.16]"
                >
                  <p className="landing_serif text-3xl font-bold tabular-nums text-white sm:text-4xl">
                    {s.value}
                  </p>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
