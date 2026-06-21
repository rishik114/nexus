"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "./supabase";
import type { CollabLayer, CollabComment } from "@/types";

interface PresenceUser {
  user_id: string;
  username: string;
  avatar_emoji: string;
  cursor_x: number;
  cursor_y: number;
}

/**
 * Subscribes to a Supabase Realtime channel for a single collab session.
 * - Postgres Changes: streams INSERT/UPDATE/DELETE on collab_layers + collab_comments
 * - Presence: broadcasts live cursor positions between contributors
 *
 * This is what makes the canvas feel "live" — every contributor's browser
 * gets pushed the same events within ~100-200ms of any change.
 */
export function useCollabRealtime(sessionId: string, me: { id: string; username: string; avatar_emoji: string }) {
  const [layers, setLayers] = useState<CollabLayer[]>([]);
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [presences, setPresences] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`collab:${sessionId}`, {
      config: { presence: { key: me.id } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collab_layers", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLayers((prev) => [...prev, payload.new as CollabLayer]);
          } else if (payload.eventType === "UPDATE") {
            setLayers((prev) => prev.map((l) => (l.id === payload.new.id ? { ...l, ...payload.new } : l)));
          } else if (payload.eventType === "DELETE") {
            setLayers((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "collab_comments", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setComments((prev) => [payload.new as CollabComment, ...prev]);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const all = Object.values(state).flat();
        setPresences(all.filter((p) => p.user_id !== me.id));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: me.id,
            username: me.username,
            avatar_emoji: me.avatar_emoji,
            cursor_x: 0,
            cursor_y: 0,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, me.id, me.username, me.avatar_emoji]);

  // Throttled cursor broadcast — call this from a mousemove handler on the canvas
  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      channelRef.current?.track({
        user_id: me.id,
        username: me.username,
        avatar_emoji: me.avatar_emoji,
        cursor_x: x,
        cursor_y: y,
      });
    },
    [me.id, me.username, me.avatar_emoji]
  );

  return { layers, setLayers, comments, setComments, presences, broadcastCursor };
}
