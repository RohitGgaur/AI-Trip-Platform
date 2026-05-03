"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { get_firebase_auth } from "@/lib/firebase_client";
import { fetch_trip, type trip_detail, type trip_member } from "@/lib/trips_api";
import { get_api_base } from "@/lib/auth_api";

type expense_category = "food" | "transport" | "accommodation" | "activity" | "shopping" | "other";
type split_type = "equal" | "custom";

type expense_item = {
  expenseId: string;
  title: string;
  amount: number;
  currency: string;
  amountInBase?: number;
  category: expense_category;
  paidByUID: string;
  splitBetween: string[];
  splitType: split_type;
  customSplits?: Record<string, number> | null;
  addedAt?: unknown;
};

type settlement_txn = { fromUID: string; toUID: string; amount: number };

type expense_summary = {
  totalSpent: number;
  budgetTotal: number | null;
  remaining: number | null;
  expenseCount: number;
};

function read_err(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data?.error?.message;
    if (typeof m === "string") return m;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

function category_label(c: expense_category): string {
  const map: Record<expense_category, string> = {
    food: "Food",
    transport: "Transport",
    accommodation: "Accommodation",
    activity: "Activity",
    shopping: "Shopping",
    other: "Other",
  };
  return map[c] || c;
}

function category_badge_class(c: expense_category): string {
  if (c === "food") return "bg-orange-100 text-orange-900 ring-orange-200/80";
  if (c === "transport") return "bg-violet-100 text-violet-900 ring-violet-200/80";
  if (c === "accommodation") return "bg-amber-100 text-amber-900 ring-amber-200/80";
  if (c === "activity") return "bg-emerald-100 text-emerald-900 ring-emerald-200/80";
  if (c === "shopping") return "bg-sky-100 text-sky-900 ring-sky-200/80";
  return "bg-stone-100 text-stone-800 ring-stone-200/80";
}

function money(amount: number, currency: string): string {
  const rounded = Math.round((amount || 0) * 100) / 100;
  return `${currency} ${rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function TripExpensesPage() {
  const route_params = useParams<{ tripId: string }>();
  const trip_id = typeof route_params?.tripId === "string" ? route_params.tripId : "";
  const [trip, set_trip] = useState<trip_detail | null>(null);
  const [loading, set_loading] = useState(true);

  const [tab, set_tab] = useState<"list" | "settlement">("list");
  const [expenses, set_expenses] = useState<expense_item[]>([]);
  const [summary, set_summary] = useState<expense_summary | null>(null);
  const [settlement, set_settlement] = useState<settlement_txn[]>([]);

  const [show_form, set_show_form] = useState(false);
  const [saving, set_saving] = useState(false);
  const [deleting_id, set_deleting_id] = useState<string | null>(null);

  const members: trip_member[] = useMemo(() => (Array.isArray(trip?.members) ? trip!.members! : []), [trip]);
  const member_name = useCallback(
    (uid: string): string => members.find((m) => m.uid === uid)?.displayName || uid.slice(0, 6),
    [members]
  );

  const current_uid = useMemo(() => get_firebase_auth().currentUser?.uid || null, []);

  const [form_title, set_form_title] = useState("");
  const [form_amount, set_form_amount] = useState<string>("");
  const [form_currency, set_form_currency] = useState<string>("INR");
  const [form_category, set_form_category] = useState<expense_category>("food");
  const [form_paid_by_uid, set_form_paid_by_uid] = useState<string>("");
  const [form_split_type, set_form_split_type] = useState<split_type>("equal");
  const [form_split_between, set_form_split_between] = useState<Record<string, boolean>>({});
  const [form_custom_splits, set_form_custom_splits] = useState<Record<string, string>>({});

  const selected_uids = useMemo(
    () => Object.entries(form_split_between).filter(([, v]) => v).map(([uid]) => uid),
    [form_split_between]
  );

  const api_base = get_api_base();

  const load_all = useCallback(async () => {
    if (!trip_id) {
      set_loading(false);
      set_trip(null);
      set_expenses([]);
      set_summary(null);
      set_settlement([]);
      return;
    }
    set_loading(true);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) return;
      const id_token = await user.getIdToken();

      const [t, ex, sum, setl] = await Promise.all([
        fetch_trip(id_token, trip_id),
        axios.get<{ success?: boolean; data?: expense_item[] }>(`${api_base}/v1/trips/${encodeURIComponent(trip_id)}/expenses`, {
          headers: { Authorization: `Bearer ${id_token}` },
          timeout: 25_000,
        }),
        axios.get<{ success?: boolean; data?: expense_summary }>(`${api_base}/v1/trips/${encodeURIComponent(trip_id)}/expenses/summary`, {
          headers: { Authorization: `Bearer ${id_token}` },
          timeout: 25_000,
        }),
        axios.get<{ success?: boolean; data?: settlement_txn[] }>(
          `${api_base}/v1/trips/${encodeURIComponent(trip_id)}/expenses/settlement`,
          { headers: { Authorization: `Bearer ${id_token}` }, timeout: 25_000 }
        ),
      ]);

      set_trip(t);
      set_expenses(Array.isArray(ex.data?.data) ? ex.data.data : []);
      set_summary(sum.data?.data || null);
      set_settlement(Array.isArray(setl.data?.data) ? setl.data.data : []);

      // Init form defaults when trip arrives
      const trip_currency = (t.currency || "INR").toUpperCase();
      set_form_currency(trip_currency);
      const init_paid_by = current_uid || (t.adminUID || "");
      set_form_paid_by_uid(init_paid_by);
      const between: Record<string, boolean> = {};
      for (const m of Array.isArray(t.members) ? t.members : []) between[m.uid] = true;
      // fallback: memberUIDs list
      if (Object.keys(between).length === 0 && Array.isArray(t.memberUIDs)) {
        for (const uid of t.memberUIDs) between[uid] = true;
      }
      set_form_split_between((prev) => (Object.keys(prev).length ? prev : between));
    } catch (e) {
      toast.error(read_err(e));
      set_expenses([]);
      set_summary(null);
      set_settlement([]);
    } finally {
      set_loading(false);
    }
  }, [api_base, current_uid, trip_id]);

  useEffect(() => {
    load_all();
  }, [load_all]);

  const open_add = () => {
    set_show_form(true);
  };

  const reset_form = () => {
    set_form_title("");
    set_form_amount("");
    set_form_category("food");
    set_form_split_type("equal");
    set_form_custom_splits({});
  };

  const submit_expense = async () => {
    if (saving) return;
    if (!trip) return;
    const title = form_title.trim();
    const amount = Number(form_amount);
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    const paid_by = form_paid_by_uid.trim();
    if (!paid_by) {
      toast.error("Select who paid.");
      return;
    }
    if (selected_uids.length === 0) {
      toast.error("Select at least one member to split between.");
      return;
    }

    let custom_splits: Record<string, number> | undefined;
    if (form_split_type === "custom") {
      custom_splits = {};
      for (const uid of selected_uids) {
        const raw = form_custom_splits[uid];
        const v = Number(raw);
        if (!raw || !v || v <= 0) {
          toast.error("Custom split amounts required for all selected members.");
          return;
        }
        custom_splits[uid] = v;
      }
    }

    set_saving(true);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) {
        toast.error("Sign in again.");
        return;
      }
      const id_token = await user.getIdToken();

      await axios.post(
        `${api_base}/v1/trips/${encodeURIComponent(trip_id)}/expenses`,
        {
          title,
          amount,
          currency: form_currency.toUpperCase(),
          category: form_category,
          paidByUID: paid_by,
          splitBetween: selected_uids,
          splitType: form_split_type,
          customSplits: form_split_type === "custom" ? custom_splits : undefined,
        },
        { headers: { Authorization: `Bearer ${id_token}` }, timeout: 30_000 }
      );

      toast.success("Expense added.");
      set_show_form(false);
      reset_form();
      await load_all();
    } catch (e) {
      toast.error(read_err(e));
    } finally {
      set_saving(false);
    }
  };

  const delete_expense = async (expense_id: string) => {
    if (deleting_id) return;
    set_deleting_id(expense_id);
    try {
      const auth = get_firebase_auth();
      const user = auth.currentUser;
      if (!user) {
        toast.error("Sign in again.");
        return;
      }
      const id_token = await user.getIdToken();
      await axios.delete(`${api_base}/v1/trips/${encodeURIComponent(trip_id)}/expenses/${encodeURIComponent(expense_id)}`, {
        headers: { Authorization: `Bearer ${id_token}` },
        timeout: 25_000,
      });
      toast.success("Expense deleted.");
      await load_all();
    } catch (e) {
      toast.error(read_err(e));
    } finally {
      set_deleting_id(null);
    }
  };

  const total_spent = summary?.totalSpent ?? 0;
  const budget_total = summary?.budgetTotal ?? null;
  const remaining = summary?.remaining ?? null;
  const remaining_is_over = typeof remaining === "number" && remaining < 0;

  const add_btn_class =
    "inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5";

  if (!trip_id) {
    return (
      <div className="w-full pb-10">
        <p className="mt-10 text-center text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-14px_rgba(11,22,40,0.14)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Money</p>
            <h1 className="font_display mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">Expenses</h1>
            <p className="mt-1 text-sm text-stone-600">Split bills, track spend, and settle up.</p>
          </div>
          <button type="button" className={add_btn_class} onClick={open_add} disabled={loading || !trip}>
            + Add Expense
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total Spent</p>
          <p className="mt-2 font_display text-xl font-semibold text-stone-900">{money(total_spent, trip?.currency || "INR")}</p>
        </div>
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Budget</p>
          <p className="mt-2 font_display text-xl font-semibold text-stone-900">
            {budget_total == null ? "—" : money(budget_total, trip?.currency || "INR")}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Remaining</p>
          <p className={`mt-2 font_display text-xl font-semibold ${remaining_is_over ? "text-rose-700" : "text-emerald-700"}`}>
            {remaining == null ? "—" : money(remaining, trip?.currency || "INR")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-full bg-stone-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => set_tab("list")}
          className={`flex-1 rounded-full px-3 py-2 font-semibold transition ${
            tab === "list" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => set_tab("settlement")}
          className={`flex-1 rounded-full px-3 py-2 font-semibold transition ${
            tab === "settlement" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Settlement
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-stone-500">Loading expenses…</p>
      ) : tab === "settlement" ? (
        <div className="mt-6 space-y-3">
          {settlement.length === 0 ? (
            <div className="rounded-2xl border border-stone-200/80 bg-white p-5 text-sm text-stone-600 shadow-sm">
              Nothing to settle yet.
            </div>
          ) : (
            settlement.map((t, idx) => (
              <div
                key={`${t.fromUID}-${t.toUID}-${idx}`}
                className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">
                    {member_name(t.fromUID)} <span className="text-stone-400">→</span> {member_name(t.toUID)}
                  </p>
                  <p className="text-xs text-stone-500">Settlement</p>
                </div>
                <p className="shrink-0 font_display text-lg font-semibold text-stone-900">{money(t.amount, trip?.currency || "INR")}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {expenses.length === 0 ? (
            <div className="rounded-2xl border border-stone-200/80 bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-medium text-stone-800">No expenses yet</p>
              <button type="button" className={`${add_btn_class} mt-5`} onClick={open_add}>
                + Add Expense
              </button>
            </div>
          ) : (
            expenses.map((e) => (
              <div
                key={e.expenseId}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-stone-900">{e.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${category_badge_class(
                        e.category
                      )}`}
                    >
                      {category_label(e.category)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    Paid by{" "}
                    <span className="font-semibold text-stone-800">
                      {current_uid && e.paidByUID === current_uid ? "You" : member_name(e.paidByUID)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="font_display text-lg font-semibold text-stone-900">{money(e.amount, e.currency)}</p>
                  <button
                    type="button"
                    onClick={() => delete_expense(e.expenseId)}
                    disabled={deleting_id === e.expenseId}
                    className="rounded-full border border-stone-200 px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
                  >
                    {deleting_id === e.expenseId ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {show_form ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <p className="font_display text-base font-semibold text-stone-900">Add expense</p>
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              onClick={() => {
                set_show_form(false);
                reset_form();
              }}
            >
              Close
            </button>
          </div>
          <div className="grid gap-4 border-t border-stone-100 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Title</span>
              <input
                value={form_title}
                onChange={(e) => set_form_title(e.target.value)}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                placeholder="e.g. Dinner at XYZ"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Amount</span>
              <input
                value={form_amount}
                onChange={(e) => set_form_amount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                placeholder="0"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Currency</span>
              <input
                value={form_currency}
                onChange={(e) => set_form_currency(e.target.value.toUpperCase().slice(0, 3))}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                placeholder="INR"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Category</span>
              <select
                value={form_category}
                onChange={(e) => set_form_category(e.target.value as expense_category)}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
              >
                {(["food", "transport", "accommodation", "activity", "shopping", "other"] as expense_category[]).map((c) => (
                  <option key={c} value={c}>
                    {category_label(c)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Who paid?</span>
              <select
                value={form_paid_by_uid}
                onChange={(e) => set_form_paid_by_uid(e.target.value)}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
              >
                <option value="" disabled>
                  Select member
                </option>
                {(members.length ? members : (trip?.memberUIDs || []).map((uid) => ({ uid, displayName: uid, photoURL: null }))).map(
                  (m) => (
                    <option key={m.uid} value={m.uid}>
                      {current_uid && m.uid === current_uid ? "You" : m.displayName}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Split</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => set_form_split_type("equal")}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    form_split_type === "equal" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => set_form_split_type("custom")}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    form_split_type === "custom" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Split between</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(members.length ? members : (trip?.memberUIDs || []).map((uid) => ({ uid, displayName: uid, photoURL: null }))).map(
                  (m) => (
                    <label key={m.uid} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(form_split_between[m.uid])}
                        onChange={(e) => set_form_split_between((s) => ({ ...s, [m.uid]: e.target.checked }))}
                      />
                      <span className="font-semibold text-stone-800">
                        {current_uid && m.uid === current_uid ? "You" : m.displayName}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {form_split_type === "custom" ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Custom amounts</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selected_uids.map((uid) => (
                    <label key={uid} className="block">
                      <span className="text-sm font-semibold text-stone-800">{member_name(uid)}</span>
                      <input
                        value={form_custom_splits[uid] || ""}
                        onChange={(e) => set_form_custom_splits((s) => ({ ...s, [uid]: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-stone-100 px-4 py-4 sm:px-5">
            <Link href={`/trips/${trip_id}`} className="text-sm font-semibold text-[#9c4221] hover:underline">
              ← Overview
            </Link>
            <button
              type="button"
              onClick={submit_expense}
              disabled={saving}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Expense"}
            </button>
          </div>
        </div>
      ) : (
        <Link href={`/trips/${trip_id}`} className="mt-8 inline-block text-sm font-semibold text-[#9c4221] hover:underline">
          ← Overview
        </Link>
      )}
    </div>
  );
}
