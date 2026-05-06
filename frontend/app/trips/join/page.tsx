"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { post_trip_join } from "@/lib/trips_api";
import { get_firebase_auth } from "@/lib/firebase_client";
import { onAuthStateChanged } from "firebase/auth";

function read_err(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data?.error?.message;
    if (typeof m === "string") return m;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

function JoinInviteInner() {
  const router = useRouter();
  const search_params = useSearchParams();
  const trip_id = search_params.get("trip_id")?.trim() || "";
  const invite_id = search_params.get("invite_id")?.trim() || "";

  const [firebase_ready, set_firebase_ready] = useState(false);
  const [uid, set_uid] = useState<string | null>(null);
  const [busy, set_busy] = useState(false);
  const [err_msg, set_err_msg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const auth = get_firebase_auth();
      set_firebase_ready(true);
      return onAuthStateChanged(auth, (u) => {
        set_uid(u?.uid ?? null);
      });
    } catch {
      set_firebase_ready(false);
    }
  }, []);

  const try_join = useCallback(async () => {
    if (!trip_id || !invite_id) return;
    set_err_msg(null);
    set_busy(true);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) return;
      const id_token = await user.getIdToken();
      await post_trip_join(id_token, trip_id, invite_id);
      toast.success("You're in — welcome to the trip.");
      router.replace(`/trips/${encodeURIComponent(trip_id)}`);
      router.refresh();
    } catch (e) {
      const m = read_err(e);
      set_err_msg(m);
      toast.error(m);
    } finally {
      set_busy(false);
    }
  }, [trip_id, invite_id, router]);

  useEffect(() => {
    if (!firebase_ready || !trip_id || !invite_id || !uid) return;
    void try_join();
  }, [firebase_ready, trip_id, invite_id, uid, try_join]);

  if (!trip_id || !invite_id) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-stone-700">
        <p className="text-sm">This invite link is incomplete (missing trip or invite id).</p>
        <Link href="/trips" className="mt-4 inline-block text-sm font-semibold text-[#9c4221] underline">
          My trips
        </Link>
      </div>
    );
  }

  const login_href = `/login?next=${encodeURIComponent(`/trips/join?trip_id=${trip_id}&invite_id=${invite_id}`)}`;

  if (!firebase_ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-stone-600">
        <p>Loading…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-stone-800">
        <h1 className="font_display text-xl font-semibold">Trip invite</h1>
        <p className="mt-2 text-sm text-stone-600">
          Sign in with the same email this invite was sent to, then we&apos;ll add you to the trip.
        </p>
        <Link
          href={login_href}
          className="mt-6 inline-block rounded-xl bg-[#9c4221] px-5 py-3 text-sm font-semibold text-white no-underline"
        >
          Sign in to accept
        </Link>
      </div>
    );
  }

  if (err_msg) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-stone-800">
        <p className="text-sm text-red-800">{err_msg}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void try_join()}
          className="mt-4 rounded-xl bg-[#9c4221] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Retrying…" : "Try again"}
        </button>
        <Link href="/trips" className="mt-4 block text-sm font-semibold text-stone-600 underline">
          My trips
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-stone-700">
      <p className="text-sm">{busy ? "Joining trip…" : "Finishing up…"}</p>
    </div>
  );
}

export default function JoinInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-stone-600">
          Loading invite…
        </div>
      }
    >
      <JoinInviteInner />
    </Suspense>
  );
}
