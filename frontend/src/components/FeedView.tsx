"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import StoryBar from "@/components/StoryBar";
import Composer from "@/components/Composer";
import PostCard from "@/components/PostCard";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Post } from "@/types";

type FeedType = "foryou" | "following" | "trending";

export default function FeedView({
  heading = "Home",
  initialFeedType = "foryou",
  showComposer = true,
}: {
  heading?: string;
  initialFeedType?: FeedType;
  showComposer?: boolean;
}) {
  const profile = useAuth((s) => s.profile);
  const loading = useAuth((s) => s.loading);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedType, setFeedType] = useState<FeedType>(initialFeedType);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    api
      .getFeed(feedType)
      .then((res) => setPosts((res as { posts: Post[] }).posts))
      .catch(() => setPosts([]))
      .finally(() => setLoadingFeed(false));
  }, [feedType]);

  function selectFeedType(type: FeedType) {
    if (type === feedType) return;
    setLoadingFeed(true);
    setFeedType(type);
  }

  function handlePosted(post: Post) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div className="flex h-screen bg-bg text-txt">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold">{heading}</div>
        </div>

        {showComposer && profile && <Composer onPosted={handlePosted} />}
        <StoryBar />

        <div className="flex border-b border-border px-4">
          {(["foryou", "following", "trending"] as FeedType[]).map((t) => (
            <button
              key={t}
              onClick={() => selectFeedType(t)}
              className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
                feedType === t ? "text-accent border-accent" : "text-txt2 border-transparent hover:text-txt"
              }`}
            >
              {t === "foryou" ? "For You" : t === "following" ? "Following" : "Trending"}
            </button>
          ))}
        </div>

        {!loading && !profile && (
          <div className="p-4 text-sm text-txt2 border-b border-border">
            <a href="/login" className="text-accent font-semibold">
              Log in
            </a>{" "}
            to post, like, and follow - you can still browse the feed below.
          </div>
        )}

        {loadingFeed ? (
          <div className="p-8 text-center text-txt2 text-sm">Loading feed...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-txt2 text-sm">
            Nothing here yet. {feedType === "following" ? "Follow some people to see their posts." : "Be the first to post."}
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </main>

      <RightPanel />
    </div>
  );
}
