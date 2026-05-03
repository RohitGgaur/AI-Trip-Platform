import type { Metadata } from "next";
import { Cormorant_Garamond, Open_Sans, Plus_Jakarta_Sans, Roboto_Slab } from "next/font/google";
import { AuthProvider } from "@/components/auth_provider";
import { NavbarGate } from "@/components/navbar_gate";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const font_body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const font_display = Cormorant_Garamond({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const font_landing_sans = Open_Sans({
  variable: "--font-landing-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const font_landing_serif = Roboto_Slab({
  variable: "--font-landing-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yatrify — travel, together",
  description:
    "Plan together: smart itineraries, live travel context, and shared trips in one calm workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${font_body.variable} ${font_display.variable} ${font_landing_sans.variable} ${font_landing_serif.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>
          <NavbarGate />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
