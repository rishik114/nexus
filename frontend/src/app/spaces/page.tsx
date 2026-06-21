"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import type { Space } from "@/types";

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    api.getLiveSpaces().then((s) => setSpaces(s as Space[])).catch(() => setSpaces([]));
  }, []);

  return (
    <div className="flex h-screen bg-bg text-txt">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-xl font-bold mb-1">Live Spaces</h1>
        <p className="text-sm text-txt2 mb-6">Audio rooms happening right now.</p>

        {spaces.length === 0 ? (
          <p className="text-sm text-txt2">No live spaces right now.</p>
        ) : (
          <div className="grid gap-3 max-w-xl">
            {spaces.map((s) => (
              <div key={s.id} className="bg-bg2 border border-border rounded-2xl overflow-hidden">
                <div
                  className="px-4 py-3 flex items-center gap-2.5 border-b border-border"
                  style={{ background: "linear-gradient(135deg, rgba(124,92,252,.2), rgba(92,244,228,.1))" }}
                >
                  <div className="w-2 h-2 rounded-full bg-accent3 shadow-[0_0_8px_var(--accent3)]" />
                  <Mic size={14} />
                  <span className="text-sm font-bold flex-1">{s.title}</span>
                  <button className="text-[11px] font-bold text-white px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                    Join
                  </button>
                </div>
                <div className="px-4 py-3 text-xs text-txt2">
                  Hosted by {s.host.display_name} · {s.listeners_count} listening
                  {s.description && <> · {s.description}</>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
