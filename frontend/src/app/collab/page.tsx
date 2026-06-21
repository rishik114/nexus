"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { CollabSession } from "@/types";

export default function CollabListPage() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function createSession() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const session = (await api.createCollabSession(title)) as CollabSession;
      router.push(`/collab/${session.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen bg-bg text-txt">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-xl font-bold mb-1">Collab</h1>
        <p className="text-sm text-txt2 mb-6">Create a shared canvas and co-create a post in real time with others.</p>

        {!profile ? (
          <p className="text-sm text-txt2">
            <a href="/login" className="text-accent font-semibold">Log in</a> to start a collab session.
          </p>
        ) : (
          <div className="bg-bg2 border border-border rounded-2xl p-5 max-w-md">
            <label className="text-xs text-txt2 mb-1.5 block">Session title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Vibes post"
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-accent/40"
            />
            <button
              onClick={createSession}
              disabled={!title.trim() || busy}
              className="text-sm font-bold text-white px-5 py-2 rounded-lg disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              {busy ? "Creating…" : "Start session"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
