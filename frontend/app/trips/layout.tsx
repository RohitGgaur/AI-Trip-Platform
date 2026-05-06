"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app_shell";
import { use_auth_store } from "@/lib/auth_store";

/** Invite accept flow — must stay reachable without login (then sign-in from join page). */
function is_public_trip_join_path(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/trips/join" || pathname.startsWith("/trips/join/");
}

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = use_auth_store((s) => s.user);
  const auth_ready = use_auth_store((s) => s.auth_ready);
  const public_join = is_public_trip_join_path(pathname);

  useLayoutEffect(() => {
    if (!auth_ready || user || public_join) return;
    window.location.replace("/");
  }, [auth_ready, user, public_join]);

  if (!auth_ready) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-sm text-stone-500">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    if (public_join) {
      return (
        <div className="min-h-[100dvh] bg-[#eef2f9]">
          {children}
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-sm text-stone-500">
        <p>Taking you home…</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
