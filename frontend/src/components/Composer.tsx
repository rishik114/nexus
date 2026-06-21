"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, Wand2, BarChart3, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Post } from "@/types";

export default function Composer({ onPosted }: { onPosted: (post: Post) => void }) {
  const profile = useAuth((s) => s.profile);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handlePost() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const tags = (text.match(/#\w+/g) || []) as string[];
      const post = await api.createPost({ caption: text, media_type: "text", tags }) as Post;
      onPosted(post);
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="flex gap-2.5 p-4 border-b border-border">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
      >
        {profile.avatar_emoji}
      </div>
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening in your world?"
          rows={1}
          className="w-full bg-bg3 border border-border rounded-xl px-3.5 py-2.5 text-[13px] resize-none focus:outline-none focus:border-accent/40"
        />
        <div className="flex items-center gap-1.5 mt-1.5">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg4 hover:text-txt" title="Photo">
            <ImageIcon size={17} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg4 hover:text-txt" title="Video">
            <Video size={17} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg4 hover:text-txt" title="AR Effect">
            <Wand2 size={17} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg4 hover:text-txt" title="Poll">
            <BarChart3 size={17} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg4 hover:text-txt" title="AI Write">
            <Sparkles size={17} />
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || busy}
            className="ml-auto text-xs font-bold text-white px-4 py-1.5 rounded-[10px] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
