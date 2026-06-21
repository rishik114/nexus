export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_emoji: string;
  verified: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string;
  media_url: string | null;
  media_type: "image" | "video" | "reel" | "text";
  location: string | null;
  tags: string[];
  ai_enhanced: boolean;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_collab: boolean;
  created_at: string;
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_emoji" | "verified">;
  liked: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
  author: Pick<Profile, "username" | "display_name" | "avatar_emoji">;
}

export interface CollabLayer {
  id: string;
  session_id: string;
  owner_id: string;
  layer_type: "image" | "text" | "drawing" | "sticker";
  content: { x: number; y: number; w: number; h: number; text?: string; emoji?: string; color?: string };
  z_index: number;
  owner?: Pick<Profile, "username" | "display_name" | "avatar_emoji">;
}

export interface CollabSession {
  id: string;
  title: string;
  owner_id: string;
  status: "active" | "published" | "archived";
  participants: { role: string; user: Pick<Profile, "id" | "username" | "display_name" | "avatar_emoji"> }[];
  layers: CollabLayer[];
  comments: CollabComment[];
}

export interface CollabComment {
  id: string;
  session_id: string;
  user_id: string;
  layer_id: string | null;
  x: number | null;
  y: number | null;
  text: string;
  resolved: boolean;
  author?: Pick<Profile, "username" | "display_name" | "avatar_emoji">;
}

export interface NexusNotification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: "like" | "comment" | "follow" | "new_post" | "collab_invite" | "mention";
  post_id: string | null;
  read: boolean;
  created_at: string;
  from_user: Pick<Profile, "username" | "display_name" | "avatar_emoji">;
}

export interface Space {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  is_live: boolean;
  listeners_count: number;
  host: Pick<Profile, "username" | "display_name" | "avatar_emoji">;
}

export interface Story {
  id: string;
  user_id: string;
  media_emoji: string;
  caption: string;
  views_count: number;
  expires_at: string;
  author: Pick<Profile, "username" | "display_name" | "avatar_emoji">;
}
