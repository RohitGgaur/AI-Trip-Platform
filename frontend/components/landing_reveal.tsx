"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type landing_reveal_props = {
  children: ReactNode;
  className?: string;
  delay_ms?: number;
};

/** Scroll-triggered fade-up for landing sections (respects prefers-reduced-motion). */
export function LandingReveal({ children, className = "", delay_ms = 0 }: landing_reveal_props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, set_visible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) set_visible(true);
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay_ms}ms` : "0ms" }}
      className={`landing_reveal_base ${visible ? "landing_reveal_visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
