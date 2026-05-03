import { create } from "zustand";
import type { User } from "firebase/auth";

type AuthSlice = {
  user: User | null;
  auth_ready: boolean;
  set_user: (user: User | null) => void;
  set_auth_ready: (ready: boolean) => void;
};

export const use_auth_store = create<AuthSlice>((set) => ({
  user: null,
  auth_ready: false,
  set_user: (user) => set({ user }),
  set_auth_ready: (auth_ready) => set({ auth_ready }),
}));
