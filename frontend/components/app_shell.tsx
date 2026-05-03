"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AppBottomNav } from "@/components/app_bottom_nav";
import { AppSidebarDesktop, AppSidebarMobileDrawer } from "@/components/app_sidebar";

/**
 * Logged-in app: no top bar — sidebar holds logo, nav, profile & logout; mobile uses drawer + FAB.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobile_drawer_open, set_mobile_drawer_open] = useState(false);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#eef2f9]">
      <button
        type="button"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-[#0b1628] text-lg text-white shadow-lg shadow-[#0b1628]/40 transition hover:bg-[#132038] md:hidden"
        aria-label="Open menu"
        onClick={() => set_mobile_drawer_open(true)}
      >
        ☰
      </button>

      <AppSidebarMobileDrawer open={mobile_drawer_open} on_close={() => set_mobile_drawer_open(false)} />

      {/* Sidebar is fixed full-height; pl reserves space so content doesn’t sit under it (md+). */}
      <AppSidebarDesktop />
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden md:pl-[260px] lg:pl-[272px]">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:px-8 md:pb-6 md:pt-8">
          {children}
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
