"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const item =
  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold text-zinc-600";

export function AppBottomNav() {
  const pathname = usePathname();
  const trips_active =
    pathname === "/trips" || (pathname.startsWith("/trips/") && !pathname.startsWith("/trips/new"));
  const festivals_active = pathname === "/festivals" || pathname.startsWith("/festivals/");
  const new_trip_active = pathname === "/trips/new";
  const profile_active = pathname === "/profile";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-stone-200/90 bg-[var(--background)] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="App mobile"
    >
      <Link
        href="/trips"
        className={`${item} ${trips_active ? "text-[#FF6B4A]" : ""}`}
      >
        <span className="text-lg" aria-hidden>
          🗺️
        </span>
        Dashboard
      </Link>
      <Link
        href="/festivals"
        className={`${item} ${festivals_active ? "text-[#FF6B4A]" : ""}`}
      >
        <span className="text-lg" aria-hidden>
          📅
        </span>
        Festivals
      </Link>
      <Link
        href="/trips/new"
        className={`${item} ${new_trip_active ? "text-[#FF6B4A]" : ""}`}
      >
        <span className="text-lg" aria-hidden>
          ➕
        </span>
        New trip
      </Link>
      <Link
        href="/profile"
        className={`${item} ${profile_active ? "text-[#FF6B4A]" : ""}`}
      >
        <span className="text-lg" aria-hidden>
          👤
        </span>
        Profile
      </Link>
    </nav>
  );
}
