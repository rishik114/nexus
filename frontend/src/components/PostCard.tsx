"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Repeat2, Share2, BadgeCheck, Sparkles, MoreHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import type { Post } from "@/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes_count);
  const [busy, setBusy] = useState(false);

  async function handleLike() {
    if (busy) return;
    setBusy(true);
    const prevLiked = liked;
    const prevLikes = likes;
    // optimistic update
    setLiked(!prevLiked);
    setLikes(prevLiked ? prevLikes - 1 : prevLikes + 1);
    try {
      const res = await api.toggleLike(post.id) as { liked: boolean; likes_count: number };
      setLiked(res.liked);
      setLikes(res.likes_count);
    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="p-4 border-b border-border">
      <div className="flex items-center gap-2.5 mb-3">
        <Link
          href={`/profile/${post.author.username}`}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent3))" }}
        >
          {post.author.avatar_emoji}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[13px] font-bold">
            <Link href={`/profile/${post.author.username}`} className="hover:underline">
              {post.author.display_name}
            </Link>
            {post.author.verified && <BadgeCheck size={13} className="text-accent" />}
          </div>
          <div className="text-[11px] text-txt2">
            @{post.author.username} · {timeAgo(post.created_at)}
            {post.location && <> · 🌏 {post.location}</>}
          </div>
        </div>
        <button className="text-txt2 hover:text-txt"><MoreHorizontal size={18} /></button>
      </div>

      {post.media_type !== "text" && (
        <div className="relative w-full aspect-[4/3] rounded-[14px] bg-bg3 flex items-center justify-center text-5xl mb-3 overflow-hidden">
          {post.media_url || "🖼️"}
          {post.ai_enhanced && (
            <span
              className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full text-white backdrop-blur"
              style={{ background: "linear-gradient(135deg, rgba(124,92,252,.9), rgba(92,244,228,.9))" }}
            >
              ✦ AI Enhanced
            </span>
          )}
          {post.is_collab && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full text-white bg-black/50 backdrop-blur">
              👥 Collab
            </span>
          )}
        </div>
      )}

      {post.ai_enhanced && (
        <div className="rounded-[10px] border border-accent3/20 bg-accent3/5 px-3 py-2.5 mb-2.5 text-[12px] leading-relaxed text-accent3 flex gap-1.5">
          <Sparkles size={13} className="shrink-0 mt-0.5" />
          <span><b>AI summary:</b> This post is gaining traction with strong engagement in its tagged communities.</span>
        </div>
      )}

      <p className="text-[13px] leading-relaxed mb-2.5">
        {post.caption}{" "}
        {post.tags.map((t) => (
          <span key={t} className="text-accent">{t} </span>
        ))}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs hover:bg-bg3 ${liked ? "text-accent2" : "text-txt2"}`}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
          {likes.toLocaleString()}
        </button>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs text-txt2 hover:bg-bg3">
          <MessageCircle size={17} />
          {post.comments_count}
        </button>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs text-txt2 hover:bg-bg3">
          <Repeat2 size={17} />
          {post.reposts_count}
        </button>
        <button className="px-2.5 py-1.5 rounded-[10px] text-txt2 hover:bg-bg3">
          <Share2 size={17} />
        </button>
        <button
          className="ml-auto px-3 py-1.5 rounded-[10px] text-xs font-semibold border"
          style={{ background: "rgba(124,92,252,.15)", color: "var(--accent)", borderColor: "rgba(124,92,252,.3)" }}
        >
          ✦ Boost
        </button>
      </div>
    </article>
  );
}
