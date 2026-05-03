"use client";

import { usePathname } from "next/navigation";
import { SiteNavbar } from "@/components/site_navbar";

const marketing_paths = new Set(["/", "/login", "/purpose", "/product", "/contact"]);

/** Site marketing shell: same glass / pill nav on home, login, and static marketing pages. */
export function NavbarGate() {
  const pathname = usePathname();
  if (!marketing_paths.has(pathname)) return null;
  return <SiteNavbar />;
}
