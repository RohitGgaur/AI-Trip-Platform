import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing_page_shell";

export const metadata: Metadata = {
  title: "Contact us — Yatrify",
  description: "Email Yatrify for support, partnerships, press, and feedback—we read every message.",
};

export default function ContactPage() {
  return (
    <MarketingPageShell wide>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14">
        {/* Left column */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF6B4A]">Contact us</p>
          <h1 className="landing_serif mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#0b1628] sm:text-4xl">
            We’re here for questions, ideas, and honest feedback.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[#0b1628]/72 md:text-lg">
            Yatrify is built for travellers and groups like yours. Whether you’re stuck signing in, curious about
            partnerships, or want to suggest a feature—we read what you send. We’re a small team, so we may not
            reply in minutes, but we do reply.
          </p>

          <div className="mt-10 space-y-6">
            <div className="rounded-2xl border border-[#0b1628]/08 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b1628]/45">
                What you can write about
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#0b1628]/75">
                <li className="flex gap-2">
                  <span className="text-[#FF6B4A]" aria-hidden>
                    →
                  </span>
                  <span>
                    <strong className="text-[#0b1628]">Product &amp; account help</strong> — sign-in, trips,
                    invites, or something that looks broken.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF6B4A]" aria-hidden>
                    →
                  </span>
                  <span>
                    <strong className="text-[#0b1628]">Partnerships</strong> — destinations, creators, or teams who
                    want to explore collaborations.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF6B4A]" aria-hidden>
                    →
                  </span>
                  <span>
                    <strong className="text-[#0b1628]">Press &amp; media</strong> — facts, logos, or interview
                    requests (we’ll route to the right person).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#FF6B4A]" aria-hidden>
                    →
                  </span>
                  <span>
                    <strong className="text-[#0b1628]">Feedback</strong> — what would make group travel calmer on
                    Yatrify? We’re listening.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-dashed border-[#0b1628]/12 bg-[#0b1628]/[0.02] px-6 py-5">
              <p className="text-sm font-semibold text-[#0b1628]">How we respond</p>
              <p className="mt-2 text-sm leading-relaxed text-[#0b1628]/65">
                Most emails get a first reply within a few business days. For urgent account access issues, mention
                “urgent” in the subject—we prioritise those when we can.
              </p>
            </div>
          </div>
        </div>

        {/* Right column — email hero */}
        <div className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-3xl border border-[#0b1628]/10 bg-gradient-to-b from-[#0b1628] to-[#152a45] p-1 shadow-2xl shadow-[#0b1628]/25">
            <div className="rounded-[1.35rem] bg-[#0b1628] px-8 pb-10 pt-9 text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B4A]/20 text-2xl" aria-hidden>
                ✉
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#FF6B4A]">Primary channel</p>
              <h2 className="landing_serif mt-2 text-2xl font-semibold">Email us directly</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                This is the fastest way to reach the team. Include your trip context or screenshots if something’s
                not working—we debug faster with detail.
              </p>
              <a
                href="mailto:hello@yatrify.com?subject=Yatrify%20—%20Question"
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#FF6B4A] px-6 py-4 text-center text-base font-semibold text-[#0b1628] transition hover:brightness-110 sm:w-auto"
              >
                hello@yatrify.com
              </a>
              <p className="mt-6 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/45">
                We’re remote-first across India—no walk-in desk. For legal or formal notices, use the same address;
                we’ll acknowledge receipt.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#0b1628]/08 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0b1628]/45">Quick links</p>
            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold">
              <Link href="/" className="text-[#FF6B4A] hover:underline">
                Home
              </Link>
              <Link href="/purpose" className="text-[#0b1628]/80 hover:text-[#FF6B4A]">
                Purpose
              </Link>
              <Link href="/product" className="text-[#0b1628]/80 hover:text-[#FF6B4A]">
                Our product
              </Link>
              <Link href="/login" className="text-[#0b1628]/80 hover:text-[#FF6B4A]">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="mt-16 border-t border-[#0b1628]/08 pt-14">
        <h2 className="landing_serif text-center text-2xl font-semibold text-[#0b1628] md:text-3xl">
          Quick answers
        </h2>
        <dl className="mx-auto mt-10 max-w-3xl space-y-6">
          {[
            {
              q: "Do you offer phone support?",
              a: "Not yet—we focus on thoughtful written replies so nothing gets lost. Email is best for bugs, account issues, and feature ideas.",
            },
            {
              q: "Can I suggest a destination or integration?",
              a: "Yes. Tell us how you travel and what would save your group time—we read feature mail closely.",
            },
            {
              q: "Is there a separate address for privacy requests?",
              a: "You can use the same hello@ address with “Privacy” in the subject; we’ll route it appropriately.",
            },
          ].map((faq) => (
            <div key={faq.q} className="rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-[#0b1628]/06">
              <dt className="landing_serif text-lg font-semibold text-[#0b1628]">{faq.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[#0b1628]/68">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-14 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b1628]/70 transition hover:text-[#FF6B4A]"
        >
          <span aria-hidden>←</span> Back to home
        </Link>
      </p>
    </MarketingPageShell>
  );
}
