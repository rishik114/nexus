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
  signup: (email: string, password: string, username: string, displayName: string) => Promise<void>;
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
        const profile = await api.me();
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
          const profile = await api.me();
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await api.me();
    set({ profile: profile as Profile });
  },

  signup: async (email, password, username, displayName) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } },
    });
    if (error) throw error;
    // Supabase may require email confirmation depending on project settings;
    // if a session comes back immediately, fetch the profile.
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const profile = await api.me();
      set({ profile: profile as Profile });
    }
  },

  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ profile: null });
  },
}));
