"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { axios_error_text, xhr_error_text } from "@/lib/api_error_text";
import { get_api_base } from "@/lib/auth_api";
import { get_firebase_auth } from "@/lib/firebase_client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FILE_INPUT_ID = "yatrify-memories-photo-input";

type memory_item = {
  memory_id: string;
  photo_url: string;
  ai_caption: string | null;
  caption: string;
};

function ts_to_ms(v: unknown): number {
  if (v != null && typeof v === "object") {
    const o = v as { seconds?: number; _seconds?: number };
    const s = typeof o.seconds === "number" ? o.seconds : typeof o._seconds === "number" ? o._seconds : null;
    if (s != null) return s * 1000;
  }
  return Date.now();
}

function map_row(raw: Record<string, unknown>, memory_id: string): memory_item {
  const photo_url = typeof raw.photoURL === "string" ? raw.photoURL : "";
  const ai =
    typeof raw.aiCaption === "string" && raw.aiCaption.trim()
      ? raw.aiCaption.trim()
      : null;
  const caption = typeof raw.caption === "string" ? raw.caption : "";
  void ts_to_ms(raw.uploadedAt);
  return { memory_id, photo_url, ai_caption: ai, caption };
}

function xhr_post_form(
  url: string,
  form: FormData,
  token: string,
  on_progress: (pct: number) => void
): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        on_progress(Math.min(100, Math.round((100 * ev.loaded) / ev.total)));
      }
    };
    xhr.onload = () => {
      try {
        const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        resolve({ status: xhr.status, json });
      } catch {
        reject(new Error("Bad response from server."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error."));
    xhr.send(form);
  });
}

export default function TripMemoriesPage() {
  const params = useParams<{ tripId: string }>();
  const trip_id = typeof params?.tripId === "string" ? params.tripId : "";
  const api_base = get_api_base();

  const [memories, set_memories] = useState<memory_item[]>([]);
  const [uploading, set_uploading] = useState(false);
  const [progress, set_progress] = useState(0);
  const [broken, set_broken] = useState<Record<string, true>>({});
  const [deleting_id, set_deleting_id] = useState<string | null>(null);

  const auth_header = useCallback(async () => {
    const u = get_firebase_auth().currentUser;
    if (!u) {
      toast.error("Sign in again.");
      return null;
    }
    const t = await u.getIdToken();
    return { Authorization: `Bearer ${t}` };
  }, []);

  const load_memories = useCallback(async () => {
    if (!trip_id) return;
    const h = await auth_header();
    if (!h) return;
    try {
      const res = await axios.get<{ data?: unknown[] }>(
        `${api_base}/v1/trips/${encodeURIComponent(trip_id)}/memories`,
        { headers: h, timeout: 60_000 }
      );
      const arr = Array.isArray(res.data?.data) ? res.data!.data! : [];
      const next: memory_item[] = [];
      for (const row of arr) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        const mid = typeof o.memoryId === "string" ? o.memoryId : "";
        if (!mid) continue;
        next.push(map_row(o, mid));
      }
      set_memories(next);
    } catch (e) {
      toast.error(axios_error_text(e));
    }
  }, [api_base, auth_header, trip_id]);

  useEffect(() => {
    void load_memories();
  }, [load_memories]);

  const handle_upload = async (file: File) => {
    if (!trip_id) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Use JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Max file size is 5 MB.");
      return;
    }

    const u = get_firebase_auth().currentUser;
    if (!u) {
      toast.error("Sign in again.");
      return;
    }

    let token: string;
    try {
      token = await u.getIdToken();
    } catch {
      toast.error("Could not get auth token.");
      return;
    }

    const url = `${api_base}/v1/trips/${encodeURIComponent(trip_id)}/memories`;
    const form = new FormData();
    form.append("photo", file, file.name || "photo.jpg");

    set_uploading(true);
    set_progress(0);

    try {
      const { status, json } = await xhr_post_form(url, form, token, set_progress);
      const body = json as { success?: boolean; data?: Record<string, unknown> };
      if (status >= 200 && status < 300 && body?.data && typeof body.data === "object") {
        const o = body.data as Record<string, unknown>;
        const mid = typeof o.memoryId === "string" ? o.memoryId : "";
        if (mid) {
          set_memories((prev) => {
            const item = map_row(o, mid);
            const rest = prev.filter((p) => p.memory_id !== mid);
            return [item, ...rest];
          });
        }
        toast.success("Uploaded.");
        // AI caption Firestore mein async aata hai — thodi der tak list refresh
        const refresh_delays_ms = [2000, 5000, 10000, 20000, 40000];
        for (const ms of refresh_delays_ms) {
          window.setTimeout(() => void load_memories(), ms);
        }
      } else {
        toast.error(xhr_error_text(body, status));
      }
    } catch (e) {
      toast.error(axios_error_text(e));
    } finally {
      set_uploading(false);
      set_progress(0);
    }
  };

  const on_file_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void handle_upload(f);
  };

  const handle_delete = async (memory_id: string) => {
    const h = await auth_header();
    if (!h || !trip_id) return;
    set_deleting_id(memory_id);
    try {
      await axios.delete(
        `${api_base}/v1/trips/${encodeURIComponent(trip_id)}/memories/${encodeURIComponent(memory_id)}`,
        { headers: h, timeout: 30_000 }
      );
      set_memories((p) => p.filter((m) => m.memory_id !== memory_id));
      toast.success("Deleted.");
    } catch (e) {
      toast.error(axios_error_text(e));
    } finally {
      set_deleting_id(null);
    }
  };

  const empty = useMemo(() => memories.length === 0 && !uploading, [memories.length, uploading]);

  return (
    <div className="w-full pb-8 pt-1">
      <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-14px_rgba(11,22,40,0.14)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Gallery</p>
            <h1 className="font_display mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">Memories</h1>
            <p className="mt-1 text-sm text-stone-600">Photos upload to Cloudinary; links saved in Firestore.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <label
              htmlFor={FILE_INPUT_ID}
              className={`inline-flex cursor-pointer items-center justify-center rounded-full bg-[#0b1628] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              Upload
            </label>
            <Link href={`/trips/${trip_id}`} className="text-sm font-semibold text-[#FF6B4A] hover:underline">
              ← Overview
            </Link>
          </div>
        </div>
      </div>

      <input
        id={FILE_INPUT_ID}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={on_file_change}
      />

      {uploading ? (
        <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-950">
          <div className="font-medium">Uploading… {progress}%</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full bg-purple-600 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {empty ? (
        <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-stone-800">No memories yet</p>
          <p className="mt-2 text-sm text-stone-600">Upload a JPEG, PNG, or WebP (max 5 MB).</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {memories.map((m) => (
            <div
              key={m.memory_id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm"
            >
              {m.photo_url && !broken[m.memory_id] ? (
                <Image
                  src={m.photo_url}
                  alt=""
                  fill
                  className="object-cover transition duration-200 group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  onError={() => set_broken((b) => ({ ...b, [m.memory_id]: true }))}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-stone-500">No preview</div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/50" />

              <button
                type="button"
                className="pointer-events-none absolute right-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold uppercase text-white opacity-0 shadow group-hover:pointer-events-auto group-hover:opacity-100 disabled:opacity-50"
                disabled={deleting_id === m.memory_id}
                onClick={(ev) => {
                  ev.stopPropagation();
                  void handle_delete(m.memory_id);
                }}
              >
                {deleting_id === m.memory_id ? "…" : "Delete"}
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2 opacity-0 transition group-hover:opacity-100">
                <p className="text-[11px] font-semibold leading-snug text-white drop-shadow-md">
                  <span className="mr-1">✨</span>
                  {m.ai_caption || "Generating caption…"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
