"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const coral = "#FF6B4A";
const navy = "#0b1628";

type tab_def = {
  href: string;
  label: string;
  end: boolean;
  icon: (props: { className?: string; active: boolean }) => ReactElement;
};

function IconOverview({ className, active }: { className?: string; active: boolean }) {
  const c = active ? coral : "currentColor";
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14 13h5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M4 13h7v9H6a2 2 0 0 1-2-2v-7Z" stroke={c} strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

function IconItinerary({ className, active }: { className?: string; active: boolean }) {
  const c = active ? coral : "currentColor";
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.5" stroke={c} strokeWidth="1.75" />
      <path d="M12 8V6M12 16v2" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity={active ? 0.9 : 0.45} />
    </svg>
  );
}

function IconExpenses({ className, active }: { className?: string; active: boolean }) {
  const c = active ? coral : "currentColor";
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="14" rx="2.5" stroke={c} strokeWidth="1.75" />
      <path d="M7 10h5M7 14h3" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity={active ? 0.85 : 0.5} />
      <circle cx="16.5" cy="12.5" r="2" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

function IconChat({ className, active }: { className?: string; active: boolean }) {
  const c = active ? coral : "currentColor";
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 18V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5.5L8 20.5V18H7a2 2 0 0 1-2-2Z"
        stroke={c}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 11h6M9 14h4" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity={active ? 0.85 : 0.45} />
    </svg>
  );
}

function IconMemories({ className, active }: { className?: string; active: boolean }) {
  const c = active ? coral : "currentColor";
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke={c} strokeWidth="1.75" />
      <circle cx="8.5" cy="10" r="1.5" fill={active ? coral : "#94a3b8"} />
      <path
        d="m21 15-4.5-4.5a1.5 1.5 0 0 0-2.1 0L9 16"
        stroke={c}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 0.95 : 0.55}
      />
    </svg>
  );
}

const build_tabs = (trip_id: string): tab_def[] => [
  {
    href: `/trips/${trip_id}`,
    label: "Overview",
    end: true,
    icon: IconOverview,
  },
  {
    href: `/trips/${trip_id}/itinerary`,
    label: "Itinerary",
    end: false,
    icon: IconItinerary,
  },
  {
    href: `/trips/${trip_id}/expenses`,
    label: "Expenses",
    end: false,
    icon: IconExpenses,
  },
  {
    href: `/trips/${trip_id}/chat`,
    label: "Chat",
    end: false,
    icon: IconChat,
  },
  {
    href: `/trips/${trip_id}/memories`,
    label: "Memories",
    end: false,
    icon: IconMemories,
  },
];

export function TripTabBar({ trip_id }: { trip_id: string }) {
  const pathname = usePathname();
  const items = build_tabs(trip_id);

  return (
    <div className="sticky top-0 z-30 mb-5 w-full">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/90 shadow-[0_16px_48px_-20px_rgba(11,22,40,0.28),0_4px_14px_-6px_rgba(11,22,40,0.12)] ring-1 ring-[#0b1628]/[0.06] backdrop-blur-xl"
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(246,248,252,0.96) 45%, rgba(238,242,249,0.92) 100%)`,
        }}
      >
        {/* Top accent — brand strip */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] opacity-95"
          style={{
            background: `linear-gradient(90deg, ${coral} 0%, #ff8a72 42%, ${navy} 100%)`,
          }}
          aria-hidden
        />

        <div className="relative px-2 pb-2 pt-[13px] sm:px-3 sm:pb-2.5 sm:pt-[15px]">
          <p
            className="mb-2 hidden px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400 sm:block"
            style={{ fontFeatureSettings: '"liga" 1' }}
          >
            Trip workspace
          </p>
          <nav
            className="-mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:justify-between sm:gap-1.5 sm:overflow-visible sm:pb-0 lg:justify-start lg:gap-2"
            aria-label="Trip sections"
          >
            {items.map(({ href, label, end, icon: Icon }) => {
              const active = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  scroll={false}
                  className={`group relative flex min-h-[46px] shrink-0 snap-start items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold tracking-tight transition-all duration-200 sm:min-h-[48px] sm:flex-1 sm:px-3 sm:py-3 sm:text-[14px] lg:flex-none lg:px-5 ${
                    active
                      ? "bg-white text-[#0b1628] shadow-[0_2px_12px_-4px_rgba(11,22,40,0.18),inset_0_1px_0_0_rgba(255,255,255,0.9)] ring-1 ring-stone-200/95"
                      : "text-stone-500 hover:bg-white/70 hover:text-[#0b1628] hover:shadow-sm hover:ring-1 hover:ring-stone-200/60"
                  } `}
                >
                  <span
                    className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9 ${
                      active ? "bg-[#FF6B4A]/10 text-[#FF6B4A]" : "bg-stone-100/90 text-stone-500 group-hover:bg-stone-200/80 group-hover:text-stone-700"
                    }`}
                  >
                    <Icon active={active} className="shrink-0" />
                  </span>
                  <span className="relative z-[1] whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
