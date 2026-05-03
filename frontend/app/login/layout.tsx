import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Yatrify",
  description:
    "Sign in or create your account — email, mobile OTP, or Google. Plan trips together on Yatrify.",
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
