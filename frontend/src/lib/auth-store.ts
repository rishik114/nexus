"use client";

import { create } from "zustand";
import { createClient } from "./supabase";
import { api } from "./api";
import type { Profile } from "@/types";

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, displayName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  profile: null,
  loading: true,

  init: async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        const profile = await api.me(data.session.access_token);
        set({ profile: profile as Profile, loading: false });
      } catch {
        set({ profile: null, loading: false });
      }
    } else {
      set({ profile: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        try {
          const profile = await api.me(session.access_token);
          set({ profile: profile as Profile });
        } catch {
          set({ profile: null });
        }
      } else {
        set({ profile: null });
      }
    });
  },

  login: async (email, password) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await api.me(data.session?.access_token);
    set({ profile: profile as Profile });
  },

  signup: async (email, password, username, displayName) => {
    const supabase = createClient();
    const res = (await api.signup({
      email,
      password,
      username,
      display_name: displayName,
    })) as {
      session: { access_token?: string; refresh_token?: string } | null;
      profile: Profile | null;
    };

    if (res.session?.access_token && res.session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
      const profile = res.profile ?? (await api.me(res.session.access_token));
      set({ profile: profile as Profile });
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  },

  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ profile: null });
  },
}));
