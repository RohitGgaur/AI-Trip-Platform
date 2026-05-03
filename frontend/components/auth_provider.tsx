"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { get_firebase_auth } from "@/lib/firebase_client";
import { use_auth_store } from "@/lib/auth_store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const set_user = use_auth_store((s) => s.set_user);
  const set_auth_ready = use_auth_store((s) => s.set_auth_ready);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const auth = get_firebase_auth();
      unsub = onAuthStateChanged(auth, (user) => {
        set_user(user);
        set_auth_ready(true);
      });
    } catch {
      set_user(null);
      set_auth_ready(true);
    }
    return () => unsub?.();
  }, [set_user, set_auth_ready]);

  return <>{children}</>;
}
