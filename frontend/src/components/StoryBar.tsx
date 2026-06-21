"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Story } from "@/types";

export default function StoryBar() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    api.getStories().then((s) => setStories(s as Story[])).catch(() => setStories([]));
  }, []);

  return (
    <div className="flex gap-3 p-4 overflow-x-auto border-b border-border">
      <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer">
        <div className="w-[58px] h-[58px] rounded-full bg-bg4 flex items-center justify-center">
          <Plus size={22} className="text-accent" />
        </div>
        <span className="text-[10px] text-txt2">Your story</span>
      </div>

      {stories.map((s) => (
        <div key={s.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer">
          <div
            className="w-[58px] h-[58px] rounded-full p-0.5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2), var(--accent3))" }}
          >
            <div className="w-full h-full rounded-full bg-bg3 flex items-center justify-center text-lg">
              {s.media_emoji}
            </div>
          </div>
          <span className="text-[10px] text-txt2 max-w-[56px] truncate">{s.author.display_name}</span>
        </div>
      ))}
    </div>
  );
}
