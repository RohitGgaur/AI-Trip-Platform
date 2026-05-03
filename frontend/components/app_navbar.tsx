"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { get_firebase_auth } from "@/lib/firebase_client";
import { use_auth_store } from "@/lib/auth_store";

export function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = use_auth_store((s) => s.user);
  const [menu_open, set_menu_open] = useState(false);
  const menu_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu_open) return;
    const on_doc = (e: MouseEvent) => {
      if (!menu_ref.current?.contains(e.target as Node)) set_menu_open(false);
    };
    document.addEventListener("click", on_doc);
    return () => document.removeEventListener("click", on_doc);
  }, [menu_open]);

  const on_logout = async () => {
    set_menu_open(false);
    try {
      await signOut(get_firebase_auth());
    } catch {
      /* ignore */
    }
    router.replace("/login");
    router.refresh();
  };

  const display_name = user?.displayName?.trim() || user?.email?.split("@")[0] || "Traveller";
  const photo_url = user?.photoURL;

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-stone-200/90 bg-[var(--background)] py-2.5 sm:py-3">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
        <Link
          href="/trips"
          className="font_display shrink-0 text-base font-semibold tracking-[-0.02em] text-zinc-900 sm:text-lg"
          style={{ fontFeatureSettings: '"liga" 1' }}
        >
          <span className="text-[#9c4221]">Y</span>atrify
        </Link>

        <div className="relative min-w-0" ref={menu_ref}>
          <button
            type="button"
            className="flex max-w-full min-w-0 items-center gap-2 rounded-xl py-1 pl-1 pr-2 text-left transition hover:bg-stone-100/80 sm:gap-3 sm:pr-3"
            aria-expanded={menu_open}
            aria-haspopup="true"
            aria-label="Account menu"
            onClick={() => set_menu_open((v) => !v)}
          >
            {photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic OAuth URLs
              <img
                src={photo_url}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full border border-stone-200 object-cover"
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-sm font-semibold text-stone-700"
                aria-hidden
              >
                {display_name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 truncate text-sm font-semibold text-zinc-800 sm:text-base">{display_name}</span>
          </button>

          {menu_open ? (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              <Link
                href="/profile"
                role="menuitem"
                className={`block px-3 py-2 text-sm font-semibold hover:bg-stone-50 ${
                  pathname === "/profile" ? "text-[#9c4221]" : "text-zinc-800"
                }`}
                onClick={() => set_menu_open(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm font-semibold text-zinc-800 hover:bg-stone-50"
                onClick={on_logout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
