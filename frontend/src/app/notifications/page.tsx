"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, UserPlus, FileText, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";
import type { NexusNotification } from "@/types";

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  new_post: FileText,
  collab_invite: Users,
  mention: MessageCircle,
};

const LABELS = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "followed you",
  new_post: "shared a new post",
  collab_invite: "invited you to collaborate",
  mention: "mentioned you",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NexusNotification[]>([]);

  useEffect(() => {
    api.getNotifications().then((n) => setItems(n as NexusNotification[])).catch(() => setItems([]));
  }, []);

  return (
    <div className="flex h-screen bg-bg text-txt">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-lg font-bold">Notifications</h1>
          <button onClick={() => api.markAllRead().then(() => setItems((p) => p.map((i) => ({ ...i, read: true }))))} className="text-xs text-accent font-semibold">
            Mark all read
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-txt2 text-sm">No notifications yet.</div>
        ) : (
          items.map((n) => {
            const Icon = ICONS[n.type] || Heart;
            return (
              <div key={n.id} className={`flex items-center gap-3 p-4 border-b border-border ${!n.read ? "bg-accent/5" : ""}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}>
                  {n.from_user?.avatar_emoji}
                </div>
                <Icon size={15} className="text-txt2 shrink-0" />
                <div className="flex-1 text-sm">
                  <b>{n.from_user?.display_name}</b> {LABELS[n.type]}
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-accent shrink-0" />}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
