import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing_footer";

type marketing_page_shell_props = {
  children: ReactNode;
  /** Wider layout for long-form marketing pages. */
  wide?: boolean;
};

/** Shared shell for marketing routes: light bg, site footer. */
export function MarketingPageShell({ children, wide = false }: marketing_page_shell_props) {
  const inner = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="landing_sans flex min-h-[calc(100dvh-5rem)] flex-col bg-[#eef2f9]">
      <div className="flex-1 px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto ${inner}`}>{children}</div>
      </div>
      <LandingFooter />
    </div>
  );
}
