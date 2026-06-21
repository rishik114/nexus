import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  // some endpoints (204-ish) return nothing
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const api = {
  // Auth
  signup: (body: { email: string; password: string; username: string; display_name?: string }) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/auth/me"),

  // Users
  searchUsers: (q: string) => request(`/api/users/search?q=${encodeURIComponent(q)}`),
  suggestions: () => request("/api/users/suggestions"),
  getProfile: (username: string) => request(`/api/users/${username}`),
  updateProfile: (body: { display_name?: string; bio?: string; avatar_emoji?: string }) =>
    request("/api/users/me", { method: "PUT", body: JSON.stringify(body) }),
  toggleFollow: (username: string) => request(`/api/users/${username}/follow`, { method: "POST" }),
  getFollowers: (username: string) => request(`/api/users/${username}/followers`),
  getFollowing: (username: string) => request(`/api/users/${username}/following`),

  // Posts
  getFeed: (type: "foryou" | "following" | "trending" = "foryou", page = 1) =>
    request(`/api/posts/feed?type=${type}&page=${page}`),
  getPost: (id: string) => request(`/api/posts/${id}`),
  createPost: (body: { caption: string; media_url?: string; media_type?: string; location?: string; tags?: string[] }) =>
    request("/api/posts", { method: "POST", body: JSON.stringify(body) }),
  deletePost: (id: string) => request(`/api/posts/${id}`, { method: "DELETE" }),
  toggleLike: (id: string) => request(`/api/posts/${id}/like`, { method: "POST" }),
  getComments: (id: string) => request(`/api/posts/${id}/comments`),
  addComment: (id: string, text: string) =>
    request(`/api/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),

  // Stories
  getStories: () => request("/api/stories"),
  createStory: (media_emoji: string, caption = "") =>
    request(`/api/stories?media_emoji=${encodeURIComponent(media_emoji)}&caption=${encodeURIComponent(caption)}`, { method: "POST" }),
  viewStory: (id: string) => request(`/api/stories/${id}/view`, { method: "POST" }),

  // Collab
  createCollabSession: (title: string) =>
    request("/api/collab/sessions", { method: "POST", body: JSON.stringify({ title }) }),
  getCollabSession: (id: string) => request(`/api/collab/sessions/${id}`),
  inviteToCollab: (id: string, username: string, role: "editor" | "viewer" = "editor") =>
    request(`/api/collab/sessions/${id}/invite`, { method: "POST", body: JSON.stringify({ username, role }) }),
  addLayer: (id: string, body: { layer_type: string; content: object; z_index?: number }) =>
    request(`/api/collab/sessions/${id}/layers`, { method: "POST", body: JSON.stringify(body) }),
  updateLayer: (sessionId: string, layerId: string, body: { content?: object; z_index?: number }) =>
    request(`/api/collab/sessions/${sessionId}/layers/${layerId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteLayer: (sessionId: string, layerId: string) =>
    request(`/api/collab/sessions/${sessionId}/layers/${layerId}`, { method: "DELETE" }),
  addCollabComment: (id: string, body: { text: string; layer_id?: string; x?: number; y?: number }) =>
    request(`/api/collab/sessions/${id}/comments`, { method: "POST", body: JSON.stringify(body) }),
  saveVersion: (id: string, description: string) =>
    request(`/api/collab/sessions/${id}/versions?description=${encodeURIComponent(description)}`, { method: "POST" }),
  listVersions: (id: string) => request(`/api/collab/sessions/${id}/versions`),
  restoreVersion: (sessionId: string, versionId: string) =>
    request(`/api/collab/sessions/${sessionId}/versions/${versionId}/restore`, { method: "POST" }),
  publishCollab: (id: string, body: { caption: string; tags?: string[] }) =>
    request(`/api/collab/sessions/${id}/publish`, { method: "POST", body: JSON.stringify(body) }),

  // Spaces
  getLiveSpaces: () => request("/api/spaces"),
  createSpace: (body: { title: string; description?: string }) =>
    request("/api/spaces", { method: "POST", body: JSON.stringify(body) }),
  joinSpace: (id: string, asSpeaker = false) =>
    request(`/api/spaces/${id}/join?as_speaker=${asSpeaker}`, { method: "POST" }),
  endSpace: (id: string) => request(`/api/spaces/${id}/end`, { method: "POST" }),

  // Notifications
  getNotifications: () => request("/api/notifications"),
  markNotificationRead: (id: string) => request(`/api/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => request("/api/notifications/read-all", { method: "PUT" }),

  // Messages
  getConversations: () => request("/api/messages/conversations"),
  startConversation: (username: string) =>
    request("/api/messages/conversations", { method: "POST", body: JSON.stringify({ username }) }),
  getMessages: (conversationId: string) => request(`/api/messages/conversations/${conversationId}`),
  sendMessage: (conversationId: string, text: string) =>
    request(`/api/messages/conversations/${conversationId}`, { method: "POST", body: JSON.stringify({ text }) }),
};
