"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { get_firebase_auth } from "@/lib/firebase_client";
import { use_auth_store } from "@/lib/auth_store";

const coral = "#FF6B4A";
const navy = "#0b1628";

const nav_row =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition";
const nav_inactive = "text-white/75 hover:bg-white/10 hover:text-white";
const nav_active = "bg-white/[0.12] text-[#FF6B4A] ring-1 ring-[#FF6B4A]/30";

type sidebar_content_props = {
  /** Call when a nav link is chosen (e.g. close mobile drawer). */
  on_navigate?: () => void;
};

export function AppSidebarContent({ on_navigate }: sidebar_content_props) {
  const pathname = usePathname();
  const user = use_auth_store((s) => s.user);
  const [account_open, set_account_open] = useState(false);
  const account_ref = useRef<HTMLDivElement>(null);

  const display_name = user?.displayName?.trim() || user?.email?.split("@")[0] || "Traveller";
  const photo_url = user?.photoURL;

  useEffect(() => {
    if (!account_open) return;
    const on_doc = (e: MouseEvent) => {
      if (!account_ref.current?.contains(e.target as Node)) set_account_open(false);
    };
    document.addEventListener("click", on_doc);
    return () => document.removeEventListener("click", on_doc);
  }, [account_open]);

  const on_logout = useCallback(async () => {
    set_account_open(false);
    on_navigate?.();
    try {
      await signOut(get_firebase_auth());
    } catch {
      /* ignore */
    }
    /* Full navigation avoids SPA getting stuck on protected routes (e.g. /trips/new) showing only “Loading…”. */
    window.location.href = "/";
  }, [on_navigate]);

  const link_click = () => on_navigate?.();

  const dashboard_active =
    pathname === "/trips" || (pathname.startsWith("/trips/") && !pathname.startsWith("/trips/new"));

  const festivals_active = pathname === "/festivals" || pathname.startsWith("/festivals/");

  const profile_active = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/trips"
        className="landing_serif mb-6 shrink-0 px-1 text-xl font-semibold tracking-tight text-white"
        onClick={link_click}
      >
        <span style={{ color: coral }}>Y</span>atrify
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col gap-1" aria-label="App">
        <Link
          href="/trips"
          className={`${nav_row} ${dashboard_active ? nav_active : nav_inactive}`}
          onClick={link_click}
        >
          <span className="text-base" aria-hidden>
            📊
          </span>
          Dashboard
        </Link>
        <Link
          href="/festivals"
          className={`${nav_row} ${festivals_active ? nav_active : nav_inactive}`}
          onClick={link_click}
        >
          <span className="text-base" aria-hidden>
            📅
          </span>
          Festivals
        </Link>
        <Link
          href="/profile"
          className={`${nav_row} ${profile_active ? nav_active : nav_inactive}`}
          onClick={link_click}
        >
          <span className="text-base" aria-hidden>
            👤
          </span>
          Profile
        </Link>
        <Link
          href="/trips/new"
          className={`${nav_row} ${pathname === "/trips/new" ? nav_active : nav_inactive}`}
          onClick={link_click}
        >
          <span className="text-base" aria-hidden>
            ➕
          </span>
          New trip
        </Link>
      </nav>

      <div className="relative mt-auto shrink-0 border-t border-white/10 pt-4" ref={account_ref}>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/10"
          aria-expanded={account_open}
          onClick={() => set_account_open((v) => !v)}
        >
          {photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo_url}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-bold text-white"
              aria-hidden
            >
              {display_name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{display_name}</span>
          <span className="text-white/50" aria-hidden>
            ▾
          </span>
        </button>
        {account_open ? (
          <div
            className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-white/10 bg-[#132338] py-1 shadow-xl"
            role="menu"
          >
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm font-semibold text-white/90 hover:bg-white/10"
              role="menuitem"
              onClick={on_logout}
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Desktop sidebar — fixed full viewport height (parent flex bugs won’t shrink it). */
export function AppSidebarDesktop() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-white/10 bg-[#0b1628] px-4 pb-6 pt-6 md:flex md:flex-col lg:w-[272px]"
      style={{ backgroundColor: navy }}
      aria-label="App navigation"
    >
      <AppSidebarContent />
    </aside>
  );
}

type mobile_drawer_props = {
  open: boolean;
  on_close: () => void;
};

/** Mobile slide-over — same nav + user as desktop. */
export function AppSidebarMobileDrawer({ open, on_close }: mobile_drawer_props) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
        aria-label="Close menu"
        onClick={on_close}
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[min(288px,88vw)] flex-col border-r border-white/10 bg-[#0b1628] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-2xl md:hidden"
        style={{ backgroundColor: navy }}
        aria-label="App navigation"
      >
        <AppSidebarContent on_navigate={on_close} />
      </aside>
    </>
  );
}
