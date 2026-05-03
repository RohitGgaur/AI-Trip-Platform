"use client";

import { useLayoutEffect } from "react";
import { AppShell } from "@/components/app_shell";
import { use_auth_store } from "@/lib/auth_store";

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  const user = use_auth_store((s) => s.user);
  const auth_ready = use_auth_store((s) => s.auth_ready);

  useLayoutEffect(() => {
    if (!auth_ready || user) return;
    window.location.replace("/");
  }, [auth_ready, user]);

  if (!auth_ready) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-sm text-stone-500">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-sm text-stone-500">
        <p>Taking you home…</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
