"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { use_auth_store } from "@/lib/auth_store";

const nav_items = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Sign in" },
  { href: "/purpose", label: "Purpose" },
  { href: "/product", label: "Our product" },
  { href: "/contact", label: "Contact" },
];

const coral = "#FF6B4A";

export function SiteNavbar() {
  const [mobile_open, set_mobile_open] = useState(false);
  const [scrolled, set_scrolled] = useState(false);
  const pathname = usePathname();
  const on_landing = pathname === "/";
  const user = use_auth_store((s) => s.user);
  const auth_ready = use_auth_store((s) => s.auth_ready);
  const show_app_cta = auth_ready && Boolean(user);

  useEffect(() => {
    if (!on_landing) {
      set_scrolled(false);
      return;
    }
    const on_scroll = () => set_scrolled(window.scrollY > 40);
    on_scroll();
    window.addEventListener("scroll", on_scroll, { passive: true });
    return () => window.removeEventListener("scroll", on_scroll);
  }, [on_landing]);

  const glass_on_hero = on_landing && !scrolled;

  return (
    <header
      className={`z-50 transition-[padding] duration-300 ${
        on_landing
          ? `fixed left-0 right-0 top-0 bg-transparent py-3 sm:py-4 ${scrolled ? "py-2.5 sm:py-3" : ""}`
          : "sticky top-0 bg-transparent py-2.5 sm:py-3"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-5">
        <div className="flex flex-col gap-2">
          <div
            className={`grid w-full grid-cols-[1fr_auto] items-center rounded-full border px-4 py-2.5 shadow-sm backdrop-blur-xl sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-5 sm:py-3 md:px-6 ${
              glass_on_hero
                ? "border-white/25 bg-[#0b1628]/35 ring-1 ring-white/15"
                : "border-[#0b1628]/08 bg-white/95 ring-1 ring-[#0b1628]/[0.06] shadow-[0_8px_40px_-12px_rgba(11,22,40,0.15)]"
            }`}
          >
            {/* Left: logo */}
            <div className="flex min-w-0 items-center justify-self-start">
              <Link
                href="/"
                className={`landing_serif shrink-0 text-lg font-semibold tracking-tight sm:text-xl ${
                  glass_on_hero ? "text-white" : "text-[#0b1628]"
                }`}
                style={{ fontFeatureSettings: '"liga" 1' }}
                onClick={() => set_mobile_open(false)}
              >
                <span style={{ color: coral }}>Y</span>atrify
              </Link>
            </div>

            {/* Center: nav — truly centered between logo and CTA */}
            <nav
              className={`landing_sans col-span-2 hidden min-w-0 justify-center justify-self-center sm:col-span-1 sm:flex sm:px-2 ${
                glass_on_hero ? "text-white" : "text-[#0b1628]/75"
              }`}
              aria-label="Main"
            >
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 lg:gap-x-7">
                {nav_items.map((item) => {
                  const is_active = pathname === item.href;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={`whitespace-nowrap text-[13px] transition lg:text-sm ${
                        glass_on_hero
                          ? is_active
                            ? "font-semibold text-white"
                            : "font-medium text-white/75 hover:text-white"
                          : is_active
                            ? "font-semibold text-[#FF6B4A]"
                            : "font-medium hover:text-[#0b1628]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Right: CTA + mobile menu */}
            <div className="flex items-center justify-end gap-2 justify-self-end sm:gap-3">
              {show_app_cta ? (
                <Link
                  href="/trips"
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-md transition sm:px-5 sm:py-2.5 sm:text-[13px] ${
                    glass_on_hero
                      ? "bg-[#FF6B4A] shadow-black/20 hover:brightness-110"
                      : "bg-[#FF6B4A] shadow-[#FF6B4A]/25 hover:brightness-105"
                  }`}
                  onClick={() => set_mobile_open(false)}
                >
                  My trips
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-md transition sm:px-5 sm:py-2.5 sm:text-[13px] ${
                    glass_on_hero
                      ? "bg-[#FF6B4A] shadow-black/20 hover:brightness-110"
                      : "bg-[#FF6B4A] shadow-[#FF6B4A]/25 hover:brightness-105"
                  }`}
                  onClick={() => set_mobile_open(false)}
                >
                  Start planning
                </Link>
              )}
              <button
                type="button"
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border sm:h-10 sm:w-10 md:hidden ${
                  glass_on_hero ? "border-white/30 bg-white/5 text-white" : "border-[#0b1628]/12 bg-white text-[#0b1628]"
                }`}
                aria-expanded={mobile_open}
                aria-controls="mobile-nav"
                onClick={() => set_mobile_open((v) => !v)}
              >
                <span className="sr-only">Menu</span>
                {mobile_open ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mobile_open ? (
            <nav
              id="mobile-nav"
              className="rounded-2xl border border-zinc-200/90 bg-white px-3 py-2 shadow-lg md:hidden"
              aria-label="Mobile main"
            >
              {show_app_cta ? (
                <>
                  <Link
                    href="/trips"
                    className="block rounded-lg px-2 py-2 text-sm font-semibold text-[#FF6B4A] hover:bg-zinc-50"
                    onClick={() => set_mobile_open(false)}
                  >
                    My trips
                  </Link>
                  <div className="my-1 border-t border-zinc-100" role="separator" />
                </>
              ) : null}
              {nav_items.map((item) => {
                const is_active = pathname === item.href;
                return (
                  <Link
                    key={item.href + item.label + "-m"}
                    href={item.href}
                    className={`block rounded-lg px-2 py-2 text-sm font-semibold ${is_active ? "text-[#FF6B4A]" : "text-zinc-800"} hover:bg-zinc-50`}
                    onClick={() => set_mobile_open(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
