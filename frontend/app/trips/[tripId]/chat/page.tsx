"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useParams } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { get_firebase_auth } from "@/lib/firebase_client";
import { get_api_base } from "@/lib/auth_api";

type chat_message =
  | {
      message_id: string;
      kind: "text";
      sender_uid: string;
      sender_name: string;
      text: string;
      sent_at_ms: number;
    }
  | {
      message_id: string;
      kind: "system";
      text: string;
      sent_at_ms: number;
    };

type server_new_message = {
  messageId: string;
  senderUID: string;
  senderName: string;
  text: string;
  type: "text";
  sentAt?: { seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number } | null;
};

type server_member_joined = { uid: string; displayName: string };
type server_typing = { uid: string; displayName: string };
type server_messages_history = { tripId: string; messages: server_new_message[] };
type ack_ok = { ok: true } & Record<string, unknown>;
type ack_err = { ok: false; error?: string };
type ack_payload = ack_ok | ack_err;

function ts_to_ms(ts: server_new_message["sentAt"]): number {
  const secs = typeof ts?.seconds === "number" ? ts.seconds : typeof ts?._seconds === "number" ? ts._seconds : null;
  const nanos =
    typeof ts?.nanoseconds === "number" ? ts.nanoseconds : typeof ts?._nanoseconds === "number" ? ts._nanoseconds : null;
  if (secs == null) return Date.now();
  return secs * 1000 + Math.floor((nanos || 0) / 1_000_000);
}

export default function TripChatPage() {
  const params = useParams<{ tripId: string }>();
  const trip_id = typeof params?.tripId === "string" ? params.tripId : "";
  const [connected, set_connected] = useState(false);
  const [joined, set_joined] = useState(false);
  const [messages, set_messages] = useState<chat_message[]>([]);
  const [draft, set_draft] = useState("");
  const [sending, set_sending] = useState(false);
  const [typing_names, set_typing_names] = useState<Record<string, string>>({});
  const [me_uid, set_me_uid] = useState<string | null>(() => get_firebase_auth().currentUser?.uid || null);

  const socket_ref = useRef<Socket | null>(null);
  const typing_timeout_ref = useRef<Record<string, number>>({});
  const typing_debounce_ref = useRef<number | null>(null);
  const bottom_ref = useRef<HTMLDivElement | null>(null);

  const api_base = get_api_base();
  const socket_base =
    api_base ||
    (typeof window !== "undefined" && process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:8000"
      : "");

  const scroll_to_bottom = () => {
    bottom_ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scroll_to_bottom();
  }, [messages.length]);

  useEffect(() => {
    const auth = get_firebase_auth();
    return auth.onAuthStateChanged((u) => set_me_uid(u?.uid || null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect_socket = async () => {
      try {
        if (!trip_id) return;
        const auth = get_firebase_auth();
        const user = auth.currentUser;
        if (!user) {
          toast.error("Sign in again.");
          return;
        }
        const id_token = await user.getIdToken();
        if (cancelled) return;

        const s = io(socket_base, {
          transports: ["polling", "websocket"],
          auth: { token: id_token },
        });
        socket_ref.current = s;

        s.on("connect", () => {
          set_connected(true);
          set_joined(false);
          s.emit("join_trip", { tripId: trip_id }, (ack: ack_payload) => {
            if (ack && typeof ack === "object" && "ok" in ack && ack.ok === true) {
              set_joined(true);
            } else {
              set_joined(false);
              toast.error((ack as any)?.error || "Failed to join trip chat.");
            }
          });
          s.emit("sync_messages", { tripId: trip_id, limit: 50 }, (ack: ack_payload) => {
            if (ack && typeof ack === "object" && "ok" in ack && ack.ok === false) {
              toast.error(ack.error || "Failed to load messages.");
            }
          });
        });

        s.on("disconnect", () => set_connected(false));
        s.on("connect_error", (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err || "connect_error");
          toast.error(`Chat connect failed: ${msg}`);
        });

        s.on("error", (p: { message?: string } | string) => {
          const msg = typeof p === "string" ? p : p?.message;
          if (msg) toast.error(msg);
        });

        s.on("new_message", (m: server_new_message) => {
          if (!m || typeof m.messageId !== "string") return;
          set_messages((prev) => {
            if (prev.some((x) => x.kind === "text" && x.message_id === m.messageId)) return prev;

            const text_norm = String(m.text || "").trim();
            const server_ms = ts_to_ms(m.sentAt || null);

            // Drop optimistic temp bubble that this server message replaces (same sender + text, ~30s window)
            const without_matching_temp = prev.filter((x) => {
              if (x.kind !== "text") return true;
              if (!x.message_id.startsWith("tmp_")) return true;
              if (String(x.text || "").trim() !== text_norm) return true;
              if (Math.abs(x.sent_at_ms - server_ms) > 45_000) return true;
              // Same user: either UIDs match, or optimistic used placeholder before me_uid hydrated
              const uid_ok =
                (!!me_uid && m.senderUID === me_uid && (x.sender_uid === me_uid || x.sender_uid === "" || x.sender_uid === "me")) ||
                x.sender_uid === m.senderUID;
              if (!uid_ok) return true;
              return false;
            });

            const next: chat_message = {
              message_id: m.messageId,
              kind: "text",
              sender_uid: m.senderUID,
              sender_name: m.senderName || "Member",
              text: m.text || "",
              sent_at_ms: server_ms,
            };
            return [...without_matching_temp, next].sort((a, b) => a.sent_at_ms - b.sent_at_ms);
          });
        });

        s.on("messages_history", (p: server_messages_history) => {
          if (!p || p.tripId !== trip_id || !Array.isArray(p.messages)) return;
          set_messages((prev) => {
            const existing = new Set(prev.filter((x) => x.kind === "text").map((x) => x.message_id));
            const mapped: chat_message[] = p.messages
              .filter((m) => m && typeof m.messageId === "string" && !existing.has(m.messageId))
              .map((m) => ({
                message_id: m.messageId,
                kind: "text",
                sender_uid: m.senderUID,
                sender_name: m.senderName || "Member",
                text: m.text || "",
                sent_at_ms: ts_to_ms(m.sentAt || null),
              }));
            return [...prev, ...mapped].sort((a, b) => a.sent_at_ms - b.sent_at_ms);
          });
        });

        s.on("member_joined", (p: server_member_joined) => {
          const name = (p?.displayName || "Someone").trim();
          set_messages((prev) => [
            ...prev,
            {
              message_id: `system_join_${p.uid}_${Date.now()}`,
              kind: "system",
              text: `${name} joined the trip`,
              sent_at_ms: Date.now(),
            },
          ]);
        });

        s.on("typing_indicator", (p: server_typing) => {
          if (!p?.uid || !p.displayName) return;
          if (me_uid && p.uid === me_uid) return;

          set_typing_names((s0) => ({ ...s0, [p.uid]: p.displayName }));

          const existing = typing_timeout_ref.current[p.uid];
          if (existing) window.clearTimeout(existing);
          typing_timeout_ref.current[p.uid] = window.setTimeout(() => {
            set_typing_names((s0) => {
              const next = { ...s0 };
              delete next[p.uid];
              return next;
            });
            delete typing_timeout_ref.current[p.uid];
          }, 1500);
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to connect chat.");
      }
    };

    connect_socket();

    return () => {
      cancelled = true;
      const s = socket_ref.current;
      if (s) {
        try {
          if (trip_id) s.emit("leave_trip", { tripId: trip_id });
        } catch {
          // ignore
        }
        s.disconnect();
      }
      socket_ref.current = null;
      for (const t of Object.values(typing_timeout_ref.current)) window.clearTimeout(t);
      typing_timeout_ref.current = {};
      if (typing_debounce_ref.current) window.clearTimeout(typing_debounce_ref.current);
      typing_debounce_ref.current = null;
    };
  }, [me_uid, socket_base, trip_id]);

  const emit_typing = () => {
    const s = socket_ref.current;
    if (!s?.connected) return;
    if (typing_debounce_ref.current) window.clearTimeout(typing_debounce_ref.current);
    typing_debounce_ref.current = window.setTimeout(() => {
      s.emit("typing", { tripId: trip_id });
    }, 250);
  };

  const send_message = async () => {
    const text = draft.trim();
    if (!text) return;
    const s = socket_ref.current;
    if (!s?.connected || !joined) {
      toast.error("Chat not connected.");
      return;
    }
    if (sending) return;
    set_sending(true);
    try {
      // Optimistic render: show message immediately
      const temp_id = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      set_messages((prev) => {
        const optimistic: chat_message = {
          message_id: temp_id,
          kind: "text",
          sender_uid: me_uid || "",
          sender_name: "You",
          text,
          sent_at_ms: Date.now(),
        };
        return [...prev, optimistic].sort((a, b) => a.sent_at_ms - b.sent_at_ms);
      });

      s.emit("send_message", { tripId: trip_id, text }, (ack: ack_payload) => {
        // If server rejected, remove optimistic message
        if (ack && typeof ack === "object" && "ok" in ack && ack.ok === false) {
          toast.error(ack.error || "Failed to send message.");
          set_messages((prev) => prev.filter((m) => m.kind !== "text" || m.message_id !== temp_id));
        }
      });
      set_draft("");
    } finally {
      set_sending(false);
    }
  };

  const typing_line = useMemo(() => {
    const names = Object.values(typing_names).filter(Boolean);
    if (names.length === 0) return "";
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others are typing…`;
  }, [typing_names]);

  return (
    <div className="flex w-full flex-col pb-8">
      <div className="mb-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-14px_rgba(11,22,40,0.14)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Crew</p>
            <h1 className="font_display mt-1 text-2xl font-semibold text-stone-900 sm:text-3xl">Chat</h1>
            <p className="mt-1 text-sm text-stone-600">
              <span className="font-medium text-[#0b1628]">
                {connected ? (joined ? "Live" : "Joining…") : "Connecting…"}
              </span>
              <span className="text-stone-400"> · </span>
              Realtime trip chat
            </p>
          </div>
          <Link href={`/trips/${trip_id}`} className="text-sm font-semibold text-[#FF6B4A] hover:underline">
            ← Overview
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <div className="max-h-[min(520px,calc(100dvh-280px))] min-h-[260px] overflow-y-auto rounded-2xl border border-stone-200/90 bg-white p-4 shadow-inner sm:min-h-[320px] sm:p-5">
          {messages.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-stone-500">
              No messages yet. Say hi.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                if (m.kind === "system") {
                  return (
                    <div key={m.message_id} className="text-center text-xs font-medium text-stone-400">
                      {m.text}
                    </div>
                  );
                }

                const is_me = me_uid && m.sender_uid === me_uid;
                return (
                  <div key={m.message_id} className={`flex ${is_me ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%]`}>
                      {!is_me ? (
                        <p className="mb-1 text-xs font-semibold text-stone-500">{m.sender_name}</p>
                      ) : null}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                          is_me ? "bg-[#0b1628] text-white" : "border border-stone-100 bg-stone-50 text-stone-900"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom_ref} />
            </div>
          )}
        </div>

        <div className="min-h-[1.25rem]">
          {typing_line ? <p className="text-sm text-stone-500">{typing_line}</p> : null}
        </div>

        <div className="flex items-end gap-2 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-[0_4px_20px_-8px_rgba(11,22,40,0.1)]">
          <textarea
            value={draft}
            onChange={(e) => {
              set_draft(e.target.value);
              emit_typing();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send_message();
              }
            }}
            rows={1}
            placeholder="Type a message…"
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:bg-white focus:ring-2 focus:ring-[#FF6B4A]/15"
          />
          <button
            type="button"
            onClick={() => void send_message()}
            disabled={sending || !draft.trim()}
            className="inline-flex h-[44px] shrink-0 items-center justify-center rounded-xl bg-[#FF6B4A] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
