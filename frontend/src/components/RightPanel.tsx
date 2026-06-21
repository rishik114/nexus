"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Profile } from "@/types";

export default function RightPanel() {
  const profile = useAuth((s) => s.profile);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profile) return;
    api.suggestions().then((s) => setSuggestions(s as Profile[])).catch(() => setSuggestions([]));
  }, [profile]);

  async function toggleFollow(username: string) {
    const res = await api.toggleFollow(username) as { following: boolean };
    setFollowing((prev) => ({ ...prev, [username]: res.following }));
  }

  return (
    <aside className="w-[300px] shrink-0 bg-bg2 border-l border-border overflow-y-auto p-4">
      <section className="mb-6">
        <h3 className="text-xs font-bold text-txt2 uppercase tracking-wide mb-3">✦ AI Studio</h3>
        <div className="rounded-[14px] border border-accent/25 p-3.5 mb-2.5" style={{ background: "linear-gradient(135deg, rgba(124,92,252,.1), rgba(252,92,156,.08))" }}>
          <div className="text-[13px] font-bold mb-1">Caption assistant <span className="text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full ml-1">AI</span></div>
          <p className="text-xs text-txt2 leading-relaxed mb-2.5">Write or enhance your captions with tone-matching AI.</p>
          <button className="text-[11px] font-semibold bg-accent text-white px-3 py-1 rounded-lg">Try it</button>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-xs font-bold text-txt2 uppercase tracking-wide mb-3">People to follow</h3>
        {suggestions.length === 0 && <p className="text-xs text-txt2">No suggestions right now.</p>}
        {suggestions.map((u) => (
          <div key={u.id} className="flex items-center gap-2.5 py-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent3), var(--accent2))" }}
            >
              {u.avatar_emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{u.display_name}</div>
              <div className="text-[11px] text-txt2 truncate">{u.followers_count} followers</div>
            </div>
            <button
              onClick={() => toggleFollow(u.username)}
              className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${
                following[u.username]
                  ? "border-border text-txt2"
                  : "border-accent text-accent hover:bg-accent hover:text-white"
              }`}
            >
              {following[u.username] ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </section>
    </aside>
  );
}
