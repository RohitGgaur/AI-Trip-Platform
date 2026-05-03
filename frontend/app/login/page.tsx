"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import type { ConfirmationResult } from "firebase/auth";
import {
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { backend_fetch_me, backend_register } from "@/lib/auth_api";
import { use_auth_store } from "@/lib/auth_store";
import { get_firebase_auth } from "@/lib/firebase_client";

type mode_type = "sign_in" | "sign_up";
type auth_method_type = "email" | "phone" | "google";

function read_firebase_error(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const c = String((err as { code?: string }).code || "");
    if (c === "auth/invalid-credential" || c === "auth/wrong-password")
      return "Email or password is wrong.";
    if (c === "auth/email-already-in-use") return "This email is already registered — try signing in.";
    if (c === "auth/weak-password") return "Password should be at least 6 characters.";
    if (c === "auth/invalid-email") return "Enter a valid email.";
    if (c === "auth/popup-closed-by-user") return "Sign-in popup was closed.";
    if (c === "auth/invalid-phone-number") return "Check the number — use country code (e.g. +91…).";
    if (c === "auth/invalid-verification-code") return "Wrong OTP. Try again.";
    if (c === "auth/code-expired") return "OTP expired — request a new one.";
    if (c === "auth/too-many-requests") return "Too many tries — wait a bit and try again.";
    if (c === "auth/missing-phone-number") return "Enter your mobile number.";
    if (c === "auth/captcha-check-failed") return "reCAPTCHA failed — refresh and try again.";
    if (c === "auth/network-request-failed")
      return "Firebase network — internet, ad blocker, ya Firebase authorized domains check karo.";
    return c.replace(/^auth\//, "").replace(/-/g, " ");
  }
  if (axios.isAxiosError(err)) {
    if (!err.response && (err.code === "ERR_NETWORK" || err.message === "Network Error")) {
      return "API tak pahunch nahi paaye — backend chalu hai? Wi‑Fi / phone se try kar rahe ho to .env se localhost hata kar khali rakho (dev proxy), ya NEXT_PUBLIC_API_BASE_URL mein PC ka LAN IP aur sahi port likho.";
    }
    const msg = err.response?.data?.error?.message;
    if (typeof msg === "string") return msg;
  }
  return "Something went wrong. Try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const auth_user = use_auth_store((s) => s.user);
  const auth_ready = use_auth_store((s) => s.auth_ready);
  const [auth_method, set_auth_method] = useState<auth_method_type>("email");
  const [mode, set_mode] = useState<mode_type>("sign_in");
  const [needs_profile, set_needs_profile] = useState(false);
  const [phone_number, set_phone_number] = useState("");
  const [firebase_ready, set_firebase_ready] = useState(false);
  const [busy, set_busy] = useState(false);

  const [display_name, set_display_name] = useState("");
  const [email, set_email] = useState("");
  const [password, set_password] = useState("");
  const [password_again, set_password_again] = useState("");

  const [phone_e164, set_phone_e164] = useState("");
  const [otp_sent, set_otp_sent] = useState(false);
  const [otp_code, set_otp_code] = useState("");
  const confirmation_ref = useRef<ConfirmationResult | null>(null);
  const recaptcha_verifier_ref = useRef<RecaptchaVerifier | null>(null);

  const clear_phone_otp = useCallback(() => {
    set_otp_sent(false);
    set_otp_code("");
    confirmation_ref.current = null;
    if (recaptcha_verifier_ref.current) {
      try {
        recaptcha_verifier_ref.current.clear();
      } catch {
        /* ignore */
      }
      recaptcha_verifier_ref.current = null;
    }
  }, []);

  useEffect(() => {
    if (auth_method !== "phone") clear_phone_otp();
  }, [auth_method, clear_phone_otp]);

  useEffect(() => {
    try {
      get_firebase_auth();
      set_firebase_ready(true);
    } catch {
      set_firebase_ready(false);
    }
  }, []);

  useEffect(() => {
    if (!auth_ready || !auth_user || needs_profile) return;
    router.replace("/trips");
  }, [auth_ready, auth_user, needs_profile, router]);

  const go_home_after_session = async () => {
    const auth = get_firebase_auth();
    const user = auth.currentUser;
    if (!user) {
      toast.error("Not signed in.");
      return;
    }
    const id_token = await user.getIdToken();
    try {
      await backend_fetch_me(id_token);
      toast.success("Welcome back.");
      router.push("/trips");
      router.refresh();
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        set_needs_profile(true);
        set_display_name(user.displayName || "");
        set_email(user.email || "");
        set_phone_number(user.phoneNumber || "");
        toast("Complete your Yatrify profile to continue.", { icon: "✈️" });
      } else {
        toast.error(read_firebase_error(e));
      }
    }
  };

  const on_sign_in = async (e: React.FormEvent) => {
    e.preventDefault();
    set_busy(true);
    try {
      const auth = get_firebase_auth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await go_home_after_session();
    } catch (err) {
      toast.error(read_firebase_error(err));
    } finally {
      set_busy(false);
    }
  };

  const on_sign_up = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password_again) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!phone_number.trim()) {
      toast.error("Phone number is required.");
      return;
    }
    set_busy(true);
    try {
      const auth = get_firebase_auth();
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, {
        displayName: display_name.trim() || cred.user.email?.split("@")[0] || "Traveller",
      });
      const id_token = await cred.user.getIdToken();
      await backend_register({
        uid: cred.user.uid,
        displayName: display_name.trim() || cred.user.displayName || "Traveller",
        email: cred.user.email || email.trim(),
        phoneNumber: phone_number.trim(),
        photoURL: cred.user.photoURL,
      });
      await backend_fetch_me(id_token);
      toast.success("Account ready.");
      router.push("/trips");
      router.refresh();
    } catch (err) {
      toast.error(read_firebase_error(err));
    } finally {
      set_busy(false);
    }
  };

  const on_google = async () => {
    set_busy(true);
    try {
      const auth = get_firebase_auth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await go_home_after_session();
    } catch (err) {
      toast.error(read_firebase_error(err));
    } finally {
      set_busy(false);
    }
  };

  const on_send_otp = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = phone_e164.trim();
    if (!raw.startsWith("+") || raw.length < 10) {
      toast.error("Use full number with + and country code (e.g. +9198…).");
      return;
    }
    set_busy(true);
    try {
      const auth = get_firebase_auth();
      if (recaptcha_verifier_ref.current) {
        try {
          recaptcha_verifier_ref.current.clear();
        } catch {
          /* ignore */
        }
        recaptcha_verifier_ref.current = null;
      }
      recaptcha_verifier_ref.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      const confirmation = await signInWithPhoneNumber(auth, raw, recaptcha_verifier_ref.current);
      confirmation_ref.current = confirmation;
      set_otp_sent(true);
      toast.success("OTP sent — check your SMS.");
    } catch (err) {
      toast.error(read_firebase_error(err));
      clear_phone_otp();
    } finally {
      set_busy(false);
    }
  };

  const on_verify_otp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation_ref.current) {
      toast.error("Request OTP first.");
      return;
    }
    set_busy(true);
    try {
      await confirmation_ref.current.confirm(otp_code.trim());
      confirmation_ref.current = null;
      try {
        recaptcha_verifier_ref.current?.clear();
      } catch {
        /* ignore */
      }
      recaptcha_verifier_ref.current = null;
      set_otp_sent(false);
      set_otp_code("");
      await go_home_after_session();
    } catch (err) {
      toast.error(read_firebase_error(err));
    } finally {
      set_busy(false);
    }
  };

  const on_finish_profile = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = get_firebase_auth();
    const user = auth.currentUser;
    if (!user) {
      toast.error("Session lost — sign in again.");
      return;
    }
    const reg_phone = (user.phoneNumber || phone_number.trim()).trim();
    const reg_email = (user.email || email.trim()).trim();
    const reg_name = (display_name.trim() || user.displayName || "Traveller").trim();
    if (!reg_phone) {
      toast.error("Phone number is required.");
      return;
    }
    if (!reg_email) {
      toast.error("Email is required for Yatrify.");
      return;
    }
    set_busy(true);
    try {
      if (display_name.trim() && user.displayName !== display_name.trim()) {
        await updateProfile(user, { displayName: display_name.trim() });
      }
      const id_token = await user.getIdToken();
      await backend_register({
        uid: user.uid,
        displayName: reg_name,
        email: reg_email,
        phoneNumber: reg_phone,
        photoURL: user.photoURL,
      });
      await backend_fetch_me(id_token);
      toast.success("Profile complete.");
      set_needs_profile(false);
      router.push("/trips");
      router.refresh();
    } catch (err) {
      toast.error(read_firebase_error(err));
    } finally {
      set_busy(false);
    }
  };

  const on_cancel_profile = async () => {
    try {
      await signOut(get_firebase_auth());
    } catch {
      /* ignore */
    }
    set_needs_profile(false);
    set_phone_number("");
    clear_phone_otp();
  };

  const input_class =
    "landing_sans mt-1.5 w-full rounded-xl border border-[#0b1628]/12 bg-white px-3.5 py-3 text-sm text-[#0b1628] shadow-[inset_0_1px_2px_rgba(11,22,40,0.04)] outline-none transition placeholder:text-[#0b1628]/38 focus:border-[#FF6B4A]/55 focus:ring-2 focus:ring-[#FF6B4A]/18";

  const label_class =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b1628]/50";

  const btn_primary =
    "rounded-full bg-[#FF6B4A] px-8 py-3 text-sm font-semibold text-[#0b1628] shadow-lg shadow-[#FF6B4A]/25 transition hover:brightness-105 disabled:opacity-50";

  const btn_dark =
    "rounded-full bg-[#0b1628] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#132038] disabled:opacity-50";

  const btn_outline =
    "rounded-full border border-[#0b1628]/15 bg-white px-6 py-3 text-sm font-semibold text-[#0b1628] transition hover:border-[#0b1628]/25 hover:bg-[#0b1628]/[0.03]";

  return (
    <div className="landing_sans flex min-h-[100dvh] flex-col bg-[#e6ebf4] lg:flex-row lg:bg-[#eef2f9]">
      <div id="recaptcha-container" className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden />

      <aside className="relative hidden min-h-0 flex-1 overflow-hidden lg:flex lg:max-w-[min(520px,44vw)] lg:flex-none lg:flex-col">
        <Image
          src="/images/tajmahal.jpg"
          alt=""
          fill
          className="object-cover object-center"
          sizes="(max-width: 1024px) 0vw, 520px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1628]/93 via-[#0b1628]/72 to-[#0b1628]/48" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1628]/88 via-transparent to-[#FF6B4A]/10" aria-hidden />
        <div className="relative z-10 flex min-h-[100dvh] flex-col justify-between p-10 xl:p-12">
          <Link href="/" className="landing_serif w-fit text-xl font-semibold tracking-tight text-white">
            <span className="text-[#FF6B4A]">Y</span>atrify
          </Link>
          <div className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FF6B4A]">Welcome</p>
            <h2 className="landing_serif mt-5 text-3xl font-semibold leading-[1.15] text-white xl:text-[2rem]">
              Travel is better when the plan stays in sync.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Sign in to share trips, split costs fairly, and keep memories with your crew.
            </p>
          </div>
          <p className="text-[11px] text-white/35">© {new Date().getFullYear()} Yatrify</p>
        </div>
      </aside>

      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0b1628] px-4 py-4 lg:hidden">
        <Link href="/" className="landing_serif text-lg font-semibold text-white">
          <span className="text-[#FF6B4A]">Y</span>atrify
        </Link>
        <Link href="/" className="text-sm font-semibold text-white/85 transition hover:text-white">
          ← Home
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:overflow-y-auto lg:px-12 lg:py-14 xl:px-16">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        {!firebase_ready ? (
          <div className="rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-amber-100/90 px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm">
            Add Firebase web keys in <code className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px]">.env.local</code>{" "}
            (<span className="font-mono text-[11px]">NEXT_PUBLIC_FIREBASE_*</span>) then reload. Enable{" "}
            <strong>Phone</strong>, <strong>Email/Password</strong>, and <strong>Google</strong> in Firebase Auth.
          </div>
        ) : null}

        <div className="rounded-3xl border border-[#0b1628]/08 bg-white/95 p-6 shadow-[0_28px_90px_-28px_rgba(11,22,40,0.38)] backdrop-blur-md sm:p-8">
          {needs_profile ? (
            <form onSubmit={on_finish_profile} className="space-y-5">
              <div>
                <h1 className="landing_serif text-2xl font-semibold tracking-tight text-[#0b1628] sm:text-[1.65rem]">
                  Complete profile
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#0b1628]/65">
                  Backend needs your name, email, and phone. We pre-fill what Firebase already has.
                </p>
              </div>
              <div>
                <label className={label_class} htmlFor="pf_name">
                  Display name
                </label>
                <input
                  id="pf_name"
                  type="text"
                  required
                  className={input_class}
                  value={display_name}
                  onChange={(e) => set_display_name(e.target.value)}
                />
              </div>
              <div>
                <label className={label_class} htmlFor="pf_email">
                  Email
                </label>
                <input
                  id="pf_email"
                  type="email"
                  required
                  className={input_class}
                  value={email}
                  onChange={(e) => set_email(e.target.value)}
                  placeholder="Required after phone sign-in"
                />
              </div>
              <div>
                <label className={label_class} htmlFor="pf_phone">
                  Phone
                </label>
                <input
                  id="pf_phone"
                  type="tel"
                  required
                  className={input_class}
                  value={phone_number}
                  onChange={(e) => set_phone_number(e.target.value)}
                  placeholder="+91…"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                <button type="submit" disabled={busy} className={`flex-1 ${btn_primary} disabled:opacity-60`}>
                  {busy ? "Saving…" : "Save & continue"}
                </button>
                <button type="button" disabled={busy} onClick={on_cancel_profile} className={`sm:w-auto ${btn_outline}`}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b1628]/45">
                Choose sign-in method
              </p>
              <div className="mt-3 flex rounded-full border border-[#0b1628]/08 bg-[#0b1628]/[0.04] p-1">
                {(["email", "phone", "google"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set_auth_method(m)}
                    className={`flex-1 rounded-full py-2.5 text-[11px] font-semibold capitalize transition sm:text-xs ${
                      auth_method === m
                        ? "bg-[#0b1628] text-white shadow-md shadow-[#0b1628]/20"
                        : "text-[#0b1628]/55 hover:text-[#0b1628]"
                    }`}
                  >
                    {m === "phone" ? "Mobile OTP" : m}
                  </button>
                ))}
              </div>

              {auth_method === "email" ? (
                <>
                  <div className="mt-6 flex rounded-full border border-[#0b1628]/08 bg-[#0b1628]/[0.04] p-1">
                    <button
                      type="button"
                      onClick={() => set_mode("sign_in")}
                      className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
                        mode === "sign_in"
                          ? "bg-white text-[#0b1628] shadow-sm ring-1 ring-[#0b1628]/08"
                          : "text-[#0b1628]/55 hover:text-[#0b1628]"
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => set_mode("sign_up")}
                      className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
                        mode === "sign_up"
                          ? "bg-white text-[#0b1628] shadow-sm ring-1 ring-[#0b1628]/08"
                          : "text-[#0b1628]/55 hover:text-[#0b1628]"
                      }`}
                    >
                      Create account
                    </button>
                  </div>

                  {mode === "sign_in" ? (
                    <form onSubmit={on_sign_in} className="mt-6 space-y-4">
                      <div>
                        <label className={label_class} htmlFor="si_email">
                          Email
                        </label>
                        <input
                          id="si_email"
                          type="email"
                          required
                          autoComplete="email"
                          className={input_class}
                          value={email}
                          onChange={(e) => set_email(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={label_class} htmlFor="si_password">
                          Password
                        </label>
                        <input
                          id="si_password"
                          type="password"
                          required
                          autoComplete="current-password"
                          className={input_class}
                          value={password}
                          onChange={(e) => set_password(e.target.value)}
                        />
                      </div>
                      <button type="submit" disabled={busy || !firebase_ready} className={`w-full ${btn_dark}`}>
                        {busy ? "Signing in…" : "Sign in with email"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={on_sign_up} className="mt-6 space-y-4">
                      <div>
                        <label className={label_class} htmlFor="su_name">
                          Display name
                        </label>
                        <input
                          id="su_name"
                          type="text"
                          required
                          autoComplete="name"
                          className={input_class}
                          value={display_name}
                          onChange={(e) => set_display_name(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={label_class} htmlFor="su_email">
                          Email
                        </label>
                        <input
                          id="su_email"
                          type="email"
                          required
                          autoComplete="email"
                          className={input_class}
                          value={email}
                          onChange={(e) => set_email(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={label_class} htmlFor="su_phone">
                          Phone
                        </label>
                        <input
                          id="su_phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          className={input_class}
                          value={phone_number}
                          onChange={(e) => set_phone_number(e.target.value)}
                          placeholder="+91…"
                        />
                      </div>
                      <div>
                        <label className={label_class} htmlFor="su_password">
                          Password
                        </label>
                        <input
                          id="su_password"
                          type="password"
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className={input_class}
                          value={password}
                          onChange={(e) => set_password(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={label_class} htmlFor="su_password2">
                          Confirm password
                        </label>
                        <input
                          id="su_password2"
                          type="password"
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className={input_class}
                          value={password_again}
                          onChange={(e) => set_password_again(e.target.value)}
                        />
                      </div>
                      <button type="submit" disabled={busy || !firebase_ready} className={`w-full ${btn_primary}`}>
                        {busy ? "Creating…" : "Create account"}
                      </button>
                    </form>
                  )}
                </>
              ) : null}

              {auth_method === "phone" ? (
                <div className="mt-6 space-y-4">
                  {!otp_sent ? (
                    <form onSubmit={on_send_otp} className="space-y-4">
                      <p className="text-sm leading-relaxed text-[#0b1628]/65">
                        We will SMS a 6-digit code. Use international format with <strong className="text-[#0b1628]">+</strong>{" "}
                        (e.g. +9198…).
                      </p>
                      <div>
                        <label className={label_class} htmlFor="ph_num">
                          Mobile number
                        </label>
                        <input
                          id="ph_num"
                          type="tel"
                          required
                          autoComplete="tel"
                          className={input_class}
                          value={phone_e164}
                          onChange={(e) => set_phone_e164(e.target.value)}
                          placeholder="+919876543210"
                        />
                      </div>
                      <button type="submit" disabled={busy || !firebase_ready} className={`w-full ${btn_primary}`}>
                        {busy ? "Sending…" : "Send OTP"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={on_verify_otp} className="space-y-4">
                      <p className="text-sm text-[#0b1628]/65">Enter the code from your SMS.</p>
                      <div>
                        <label className={label_class} htmlFor="ph_otp">
                          OTP
                        </label>
                        <input
                          id="ph_otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                          maxLength={8}
                          className={input_class}
                          value={otp_code}
                          onChange={(e) => set_otp_code(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                        />
                      </div>
                      <button type="submit" disabled={busy || !firebase_ready} className={`w-full ${btn_dark}`}>
                        {busy ? "Verifying…" : "Verify & sign in"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => clear_phone_otp()}
                        className="w-full text-sm font-semibold text-[#FF6B4A] transition hover:underline"
                      >
                        Change number
                      </button>
                    </form>
                  )}
                </div>
              ) : null}

              {auth_method === "google" ? (
                <div className="mt-8 space-y-4">
                  <p className="text-center text-sm leading-relaxed text-[#0b1628]/65">
                    Use your Google account — same Firebase session as email / phone.
                  </p>
                  <button
                    type="button"
                    disabled={busy || !firebase_ready}
                    onClick={on_google}
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-[#0b1628]/12 bg-white py-3.5 text-sm font-semibold text-[#0b1628] shadow-sm transition hover:border-[#0b1628]/20 hover:bg-[#0b1628]/[0.03] disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
