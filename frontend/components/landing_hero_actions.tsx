"use client";

import Link from "next/link";
import { use_auth_store } from "@/lib/auth_store";

const accent = "#FF6B4A";

export function LandingHeroActions() {
  const user = use_auth_store((s) => s.user);
  const auth_ready = use_auth_store((s) => s.auth_ready);

  if (!auth_ready) {
    return (
      <div className="landing_hero_line landing_hero_delay_3 mt-12 flex flex-wrap items-center gap-4">
        <div className="h-12 min-w-[140px] animate-pulse rounded-full bg-white/20" aria-hidden />
        <div className="h-12 min-w-[120px] animate-pulse rounded-full bg-white/10" aria-hidden />
      </div>
    );
  }

  if (user) {
    return (
      <div className="landing_hero_line landing_hero_delay_3 mt-12 flex flex-wrap items-center gap-4">
        <Link
          href="/trips"
          className="inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-[#0b1628] shadow-lg shadow-black/25 transition hover:brightness-105"
          style={{ backgroundColor: accent }}
        >
          My trips
        </Link>
        <Link
          href="/trips/new"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
        >
          New trip
        </Link>
      </div>
    );
  }

  return (
    <div className="landing_hero_line landing_hero_delay_3 mt-12 flex flex-wrap items-center gap-4">
      <Link
        href="/login"
        className="inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-[#0b1628] shadow-lg shadow-black/25 transition hover:brightness-105"
        style={{ backgroundColor: accent }}
      >
        Start free
      </Link>
      <Link
        href="/#what"
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
      >
        What we do
      </Link>
    </div>
  );
}
