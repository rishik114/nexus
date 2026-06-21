"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PostCard from "@/components/PostCard";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Profile, Post } from "@/types";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const me = useAuth((s) => s.profile);
  const [profile, setProfile] = useState<(Profile & { posts: Post[] }) | null>(null);

  useEffect(() => {
    api.getProfile(username).then((p) => setProfile(p as Profile & { posts: Post[] }));
  }, [username]);

  async function toggleFollow() {
    if (!profile) return;
    const res = (await api.toggleFollow(username)) as { following: boolean; followers_count: number };
    setProfile({ ...profile, is_following: res.following, followers_count: res.followers_count });
  }

  if (!profile) {
    return (
      <div className="flex h-screen bg-bg text-txt">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-txt2">Loading…</main>
      </div>
    );
  }

  const isMe = me?.username === username;

  return (
    <div className="flex h-screen bg-bg text-txt">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              {profile.avatar_emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold">{profile.display_name}</h1>
                {profile.verified && <BadgeCheck size={16} className="text-accent" />}
              </div>
              <p className="text-sm text-txt2 mb-2">@{profile.username}</p>
              <p className="text-sm mb-3">{profile.bio}</p>
              <div className="flex gap-4 text-sm">
                <span><b>{profile.posts_count}</b> <span className="text-txt2">posts</span></span>
                <span><b>{profile.followers_count}</b> <span className="text-txt2">followers</span></span>
                <span><b>{profile.following_count}</b> <span className="text-txt2">following</span></span>
              </div>
            </div>
            {!isMe && me && (
              <button
                onClick={toggleFollow}
                className={`text-xs font-bold px-4 py-2 rounded-full border ${
                  profile.is_following
                    ? "border-border text-txt2"
                    : "border-accent text-accent hover:bg-accent hover:text-white"
                }`}
              >
                {profile.is_following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {profile.posts.length === 0 ? (
          <div className="p-8 text-center text-txt2 text-sm">No posts yet.</div>
        ) : (
          profile.posts.map((p) => <PostCard key={p.id} post={{ ...p, author: profile }} />)
        )}
      </main>
    </div>
  );
}
