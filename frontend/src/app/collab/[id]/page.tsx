"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Type, ImageIcon, Pencil, Smile, Sparkles, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useCollabRealtime } from "@/lib/useCollabRealtime";
import type { CollabSession, CollabLayer } from "@/types";

export default function CollabPage() {
  const { id } = useParams<{ id: string }>();
  const profile = useAuth((s) => s.profile);
  const [session, setSession] = useState<CollabSession | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [tab, setTab] = useState<"people" | "layers" | "history" | "ai">("people");
  const canvasRef = useRef<HTMLDivElement>(null);

  const rt = useCollabRealtime(
    id,
    profile
      ? { id: profile.id, username: profile.username, avatar_emoji: profile.avatar_emoji }
      : { id: "anon", username: "anon", avatar_emoji: "👤" }
  );

  useEffect(() => {
    api.getCollabSession(id).then((s) => {
      const sess = s as CollabSession;
      setSession(sess);
      rt.setLayers(sess.layers);
      rt.setComments(sess.comments);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [id]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      rt.broadcastCursor(e.clientX - rect.left, e.clientY - rect.top);
    },
    [rt]
  );

  async function addTextLayer() {
    const layer = (await api.addLayer(id, {
      layer_type: "text",
      content: { x: 40, y: 40, w: 200, h: 40, text: "New text", color: "#f0f0ff" },
    })) as CollabLayer;
    rt.setLayers((prev) => [...prev, layer]);
  }

  async function addStickerLayer(emoji: string) {
    const layer = (await api.addLayer(id, {
      layer_type: "sticker",
      content: { x: 80, y: 80, w: 100, h: 100, emoji },
    })) as CollabLayer;
    rt.setLayers((prev) => [...prev, layer]);
  }

  async function postComment() {
    if (!commentText.trim()) return;
    await api.addCollabComment(id, { text: commentText, x: 50, y: 50 });
    setCommentText("");
  }

  async function handlePublish() {
    if (!session) return;
    const caption = prompt("Caption for this collab post?") || "Made with Nexus Collab ✨";
    await api.publishCollab(id, { caption });
    alert("Published! Check your feed.");
  }

  if (!session) return <div className="min-h-screen flex items-center justify-center text-txt2">Loading session…</div>;

  return (
    <div className="min-h-screen bg-bg text-txt flex flex-col">
      {/* Topbar */}
      <div className="bg-bg2 border-b border-border px-4 py-2.5 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green shrink-0" />
        <div>
          <div className="text-sm font-semibold">{session.title}</div>
          <div className="text-[11px] text-txt2">{session.participants.length} contributors</div>
        </div>
        <div className="flex ml-2">
          {session.participants.map((p, i) => (
            <div
              key={p.user.id}
              className="w-6.5 h-6.5 rounded-full border-2 border-bg2 text-[9px] font-bold flex items-center justify-center"
              style={{ marginLeft: i === 0 ? 0 : -6, background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
            >
              {p.user.avatar_emoji}
            </div>
          ))}
        </div>
        <button
          onClick={handlePublish}
          className="ml-auto text-xs font-bold text-white px-4 py-1.5 rounded-full"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
        >
          Publish
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 p-4 border-r border-border flex flex-col">
          <div className="flex items-center gap-1.5 mb-3">
            <button onClick={addTextLayer} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg3 hover:text-accent" title="Add text">
              <Type size={17} />
            </button>
            <button onClick={() => addStickerLayer("🖼️")} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg3 hover:text-accent" title="Add image placeholder">
              <ImageIcon size={17} />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg3 hover:text-accent" title="Draw">
              <Pencil size={17} />
            </button>
            <button onClick={() => addStickerLayer("✨")} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt2 hover:bg-bg3 hover:text-accent" title="Sticker">
              <Smile size={17} />
            </button>
            <span className="ml-auto text-[11px] text-txt2">{rt.layers.length} layers · live</span>
          </div>

          <div
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            className="relative flex-1 bg-bg3 border border-border rounded-2xl overflow-hidden cursor-crosshair"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {rt.layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className={`absolute rounded-lg border-2 cursor-pointer ${
                  selectedLayer === layer.id ? "border-accent" : "border-transparent hover:border-accent/50"
                }`}
                style={{ left: layer.content.x, top: layer.content.y, width: layer.content.w, height: layer.content.h }}
              >
                {layer.layer_type === "text" ? (
                  <div className="w-full h-full bg-accent/15 rounded-lg flex items-center px-3 text-sm font-bold">
                    {layer.content.text}
                  </div>
                ) : (
                  <div className="w-full h-full bg-bg4 rounded-lg flex items-center justify-center text-3xl">
                    {layer.content.emoji || "🖼️"}
                  </div>
                )}
                {layer.owner && (
                  <span
                    className="absolute -top-2.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: "rgba(124,92,252,.9)", color: "#fff" }}
                  >
                    {layer.owner.display_name}
                  </span>
                )}
              </div>
            ))}

            {/* live cursors */}
            {rt.presences.map((p) => (
              <div
                key={p.user_id}
                className="absolute pointer-events-none transition-all duration-200"
                style={{ left: p.cursor_x, top: p.cursor_y }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-accent3 mb-0.5" />
                <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent3 text-bg whitespace-nowrap">
                  {p.username}
                </div>
              </div>
            ))}

            {rt.layers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-txt2 text-sm">
                Empty canvas — add a text or sticker layer to get started
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[280px] shrink-0 bg-bg2 flex flex-col">
          <div className="flex border-b border-border">
            {(["people", "layers", "history", "ai"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-[11px] font-bold text-center border-b-2 ${
                  tab === t ? "text-accent border-accent" : "text-txt2 border-transparent"
                }`}
              >
                {t === "ai" ? "✦ AI" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === "people" &&
              session.participants.map((p) => (
                <div key={p.user.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                  >
                    {p.user.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{p.user.display_name}</div>
                    <div className="text-[10px] text-txt2 capitalize">{p.role}</div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-green" />
                </div>
              ))}

            {tab === "layers" &&
              rt.layers.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLayer(l.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer mb-1 ${
                    selectedLayer === l.id ? "bg-accent/15 border border-accent/25" : "hover:bg-bg3"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-accent/20 flex items-center justify-center text-xs">
                    {l.layer_type === "text" ? "T" : l.content.emoji || "🖼️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{l.layer_type}</div>
                    <div className="text-[10px] text-txt2">{l.owner?.display_name}</div>
                  </div>
                </div>
              ))}

            {tab === "history" && <HistoryTab sessionId={id} />}

            {tab === "ai" && (
              <div className="flex flex-col gap-2.5">
                <div className="rounded-lg border border-accent/20 bg-accent/8 p-2.5">
                  <div className="text-xs font-bold text-accent3 mb-1">✦ Composition check</div>
                  <p className="text-[11px] text-txt2 leading-relaxed">AI suggests balancing layer placement for better visual flow.</p>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/8 p-2.5">
                  <div className="text-xs font-bold text-accent3 mb-1">✦ Caption suggestions</div>
                  <p className="text-[11px] text-txt2 leading-relaxed">Based on your layers, AI has caption ideas ready when you publish.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-2.5 flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && postComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-accent/40"
            />
            <button onClick={postComment} className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ sessionId }: { sessionId: string }) {
  const [versions, setVersions] = useState<{ id: string; description: string; created_at: string; user: { display_name: string } }[]>([]);

  useEffect(() => {
    api.listVersions(sessionId).then((v) => setVersions(v as typeof versions));
  }, [sessionId]);

  async function restore(versionId: string) {
    await api.restoreVersion(sessionId, versionId);
    window.location.reload();
  }

  if (versions.length === 0) return <p className="text-xs text-txt2">No saved versions yet.</p>;

  return (
    <>
      {versions.map((v) => (
        <div key={v.id} className="py-2 border-b border-border last:border-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold">{v.description}</span>
          </div>
          <div className="text-[10px] text-txt2 mb-1">{v.user.display_name}</div>
          <button onClick={() => restore(v.id)} className="text-[10px] text-accent font-semibold">
            Restore this version
          </button>
        </div>
      ))}
    </>
  );
}
