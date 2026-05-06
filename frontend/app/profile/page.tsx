"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { axios_error_text } from "@/lib/api_error_text";
import { get_api_base } from "@/lib/auth_api";
import { get_firebase_auth } from "@/lib/firebase_client";
import { use_auth_store } from "@/lib/auth_store";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"] as const;
const BUDGET_OPTIONS = [
  { value: "backpacker", label: "Backpacker" },
  { value: "mid", label: "Mid" },
  { value: "luxury", label: "Luxury" },
] as const;

const INTEREST_TAGS = ["Food", "Adventure", "Culture", "History", "Nature", "Shopping"] as const;

type server_user = {
  homeCurrency?: string;
  budgetPreference?: string;
  interests?: string[];
  displayName?: string;
  email?: string;
};

export default function ProfilePage() {
  const auth_user = use_auth_store((s) => s.user);
  const api_base = get_api_base();
  const [loading, set_loading] = useState(true);
  const [saving, set_saving] = useState(false);
  const [server, set_server] = useState<server_user | null>(null);
  const [home_currency, set_home_currency] = useState<string>("INR");
  const [budget, set_budget] = useState<string>("mid");
  const [interests, set_interests] = useState<string[]>([]);

  const refresh_profile = useCallback(async () => {
    const auth = get_firebase_auth();
    const user = auth.currentUser;
    if (!user) {
      set_loading(false);
      return;
    }
    const token = await user.getIdToken();
    try {
      const res = await axios.get<{ data?: server_user }>(`${api_base}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25_000,
      });
      const data = res.data?.data;
      if (data) {
        set_server(data);
        if (data.homeCurrency) set_home_currency(data.homeCurrency);
        if (data.budgetPreference) set_budget(data.budgetPreference);
        if (Array.isArray(data.interests)) set_interests(data.interests);
      }
    } catch {
      toast.error("Could not load profile.");
    } finally {
      set_loading(false);
    }
  }, [api_base]);

  useEffect(() => {
    void refresh_profile();
  }, [refresh_profile]);

  const toggle_interest = (tag: string) => {
    set_interests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const save = async () => {
    const auth = get_firebase_auth();
    const user = auth.currentUser;
    if (!user) {
      toast.error("Sign in again.");
      return;
    }
    set_saving(true);
    try {
      const token = await user.getIdToken();
      await axios.patch(
        `${api_base}/v1/auth/me`,
        {
          homeCurrency: home_currency,
          budgetPreference: budget,
          interests,
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 25_000 }
      );
      toast.success("Saved.");
      await refresh_profile();
    } catch (e) {
      toast.error(axios_error_text(e));
    } finally {
      set_saving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-stone-600">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font_display text-2xl font-semibold text-stone-900">Profile</h1>

      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {auth_user?.photoURL ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={auth_user.photoURL}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-2 ring-stone-200"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-200 text-2xl text-stone-500">
            ?
          </div>
        )}
        <div className="text-center">
          <p className="font-semibold text-stone-900">
            {server?.displayName || auth_user?.displayName || "—"}
          </p>
          <p className="text-sm text-stone-600">{server?.email || auth_user?.email || "—"}</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <p className="text-sm font-medium text-stone-800">Home currency</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set_home_currency(c)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  home_currency === c
                    ? "bg-purple-600 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-800">Budget preference</p>
          <div className="mt-2 flex flex-col gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="budget"
                  value={opt.value}
                  checked={budget === opt.value}
                  onChange={() => set_budget(opt.value)}
                  className="accent-purple-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-800">Interests</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle_interest(tag)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  interests.includes(tag)
                    ? "bg-amber-600 text-white"
                    : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="w-full rounded-full bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
