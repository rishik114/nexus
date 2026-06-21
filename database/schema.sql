-- ============================================================================
-- NEXUS — Database Schema (PostgreSQL / Supabase)
-- ============================================================================
-- Run in the Supabase SQL Editor, or via `psql -f schema.sql` on any Postgres 14+.
-- Uses Supabase's built-in auth.users table; profiles extends it 1:1.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null check (char_length(username) between 3 and 30),
  display_name    text not null default '',
  bio             text default '',
  avatar_url      text,
  avatar_emoji    text default '👤',
  verified        boolean default false,
  followers_count int default 0,
  following_count int default 0,
  posts_count     int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_profiles_username on profiles(username);

-- ============================================================================
-- 2. POSTS
-- ============================================================================
create table posts (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references profiles(id) on delete cascade,
  caption            text,
  media_url          text,
  media_type         text check (media_type in ('image','video','reel','text')) default 'image',
  location           text,
  tags               text[] default '{}',
  ai_enhanced        boolean default false,
  likes_count        int default 0,
  comments_count     int default 0,
  reposts_count      int default 0,
  is_collab          boolean default false,
  collab_session_id  uuid,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index idx_posts_user on posts(user_id);
create index idx_posts_created on posts(created_at desc);
create index idx_posts_tags on posts using gin(tags);

-- ============================================================================
-- 3. STORIES
-- ============================================================================
create table stories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  media_url   text,
  media_emoji text,
  caption     text,
  views_count int default 0,
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  created_at  timestamptz default now()
);

create index idx_stories_user on stories(user_id);
create index idx_stories_expires on stories(expires_at);

create table story_views (
  id        uuid primary key default uuid_generate_v4(),
  story_id  uuid not null references stories(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  unique (story_id, viewer_id)
);

-- ============================================================================
-- 4. LIKES
-- ============================================================================
create table likes (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

create index idx_likes_post on likes(post_id);
create index idx_likes_user on likes(user_id);

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================
create table comments (
  id                uuid primary key default uuid_generate_v4(),
  post_id           uuid not null references posts(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  text              text not null,
  created_at        timestamptz default now()
);

create index idx_comments_post on comments(post_id);

-- ============================================================================
-- 6. FOLLOWS
-- ============================================================================
create table follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id),
  check (follower_id != following_id)
);

create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);

-- ============================================================================
-- 7. NOTIFICATIONS
-- ============================================================================
create table notifications (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references profiles(id) on delete cascade,
  from_user_id       uuid references profiles(id) on delete cascade,
  type               text check (type in ('like','comment','follow','new_post','collab_invite','mention')) not null,
  post_id            uuid references posts(id) on delete cascade,
  collab_session_id  uuid,
  read               boolean default false,
  created_at         timestamptz default now()
);

create index idx_notif_user on notifications(user_id, read);

-- ============================================================================
-- 8. DIRECT MESSAGES
-- ============================================================================
create table conversations (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  text            text,
  media_url       text,
  read            boolean default false,
  created_at      timestamptz default now()
);

create index idx_messages_conv on messages(conversation_id, created_at);

-- ============================================================================
-- 9. COLLAB SESSIONS  (real-time collaborative canvas)
-- ============================================================================
create table collab_sessions (
  id                 uuid primary key default uuid_generate_v4(),
  title              text not null default 'Untitled collab',
  owner_id           uuid not null references profiles(id) on delete cascade,
  status             text check (status in ('active','published','archived')) default 'active',
  published_post_id  uuid references posts(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table posts
  add constraint fk_posts_collab_session
  foreign key (collab_session_id) references collab_sessions(id) on delete set null;

create table collab_participants (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references collab_sessions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text check (role in ('owner','editor','viewer')) default 'editor',
  joined_at   timestamptz default now(),
  unique (session_id, user_id)
);

-- Canvas layers (image/text/drawing objects placed by contributors)
create table collab_layers (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references collab_sessions(id) on delete cascade,
  owner_id    uuid not null references profiles(id) on delete cascade,
  layer_type  text check (layer_type in ('image','text','drawing','sticker')) not null,
  content     jsonb not null default '{}',  -- { x, y, w, h, text, color, src, rotation, zIndex }
  z_index     int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index idx_layers_session on collab_layers(session_id);

-- Pinned comments on the canvas
create table collab_comments (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references collab_sessions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  layer_id    uuid references collab_layers(id) on delete cascade,
  x           numeric,
  y           numeric,
  text        text not null,
  resolved    boolean default false,
  created_at  timestamptz default now()
);

-- Version history snapshots
create table collab_versions (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references collab_sessions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  description text not null,
  snapshot    jsonb not null,
  created_at  timestamptz default now()
);

create index idx_versions_session on collab_versions(session_id, created_at desc);

-- ============================================================================
-- 10. LIVE SPACES  (audio/video rooms)
-- ============================================================================
create table spaces (
  id              uuid primary key default uuid_generate_v4(),
  host_id         uuid not null references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  is_live         boolean default true,
  listeners_count int default 0,
  created_at      timestamptz default now(),
  ended_at        timestamptz
);

create table space_speakers (
  space_id  uuid not null references spaces(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      text check (role in ('host','speaker','listener')) default 'listener',
  joined_at timestamptz default now(),
  primary key (space_id, user_id)
);

-- ============================================================================
-- TRIGGERS — keep denormalized counters in sync
-- ============================================================================
create or replace function fn_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_posts_updated before update on posts
  for each row execute function fn_touch_updated_at();
create trigger trg_profiles_updated before update on profiles
  for each row execute function fn_touch_updated_at();
create trigger trg_collab_sessions_updated before update on collab_sessions
  for each row execute function fn_touch_updated_at();

create or replace function fn_likes_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_likes_count
  after insert or delete on likes
  for each row execute function fn_likes_count();

create or replace function fn_comments_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_comments_count
  after insert or delete on comments
  for each row execute function fn_comments_count();

create or replace function fn_follow_counts() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif (tg_op = 'DELETE') then
    update profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_follow_counts
  after insert or delete on follows
  for each row execute function fn_follow_counts();

create or replace function fn_posts_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update profiles set posts_count = posts_count + 1 where id = new.user_id;
  elsif (tg_op = 'DELETE') then
    update profiles set posts_count = greatest(0, posts_count - 1) where id = old.user_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_posts_count
  after insert or delete on posts
  for each row execute function fn_posts_count();

-- auto-create profile when a new Supabase auth user signs up
create or replace function fn_handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New User')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table posts enable row level security;
alter table stories enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table collab_sessions enable row level security;
alter table collab_participants enable row level security;
alter table collab_layers enable row level security;
alter table collab_comments enable row level security;
alter table collab_versions enable row level security;
alter table spaces enable row level security;
alter table space_speakers enable row level security;

create policy "profiles_public_read" on profiles for select using (true);
create policy "profiles_owner_update" on profiles for update using (auth.uid() = id);

create policy "posts_public_read" on posts for select using (true);
create policy "posts_owner_insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts_owner_update" on posts for update using (auth.uid() = user_id);
create policy "posts_owner_delete" on posts for delete using (auth.uid() = user_id);

create policy "stories_public_read" on stories for select using (true);
create policy "stories_owner_insert" on stories for insert with check (auth.uid() = user_id);
create policy "stories_owner_delete" on stories for delete using (auth.uid() = user_id);

create policy "likes_public_read" on likes for select using (true);
create policy "likes_owner_insert" on likes for insert with check (auth.uid() = user_id);
create policy "likes_owner_delete" on likes for delete using (auth.uid() = user_id);

create policy "comments_public_read" on comments for select using (true);
create policy "comments_owner_insert" on comments for insert with check (auth.uid() = user_id);
create policy "comments_owner_delete" on comments for delete using (auth.uid() = user_id);

create policy "follows_public_read" on follows for select using (true);
create policy "follows_owner_insert" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_owner_delete" on follows for delete using (auth.uid() = follower_id);

create policy "notif_owner_read" on notifications for select using (auth.uid() = user_id);
create policy "notif_owner_update" on notifications for update using (auth.uid() = user_id);

create policy "conv_participant_read" on conversations for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
);
create policy "conv_part_read" on conversation_participants for select using (
  exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid())
);
create policy "messages_participant_read" on messages for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);
create policy "messages_participant_insert" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);

create policy "collab_session_participant_read" on collab_sessions for select using (
  exists (select 1 from collab_participants cp where cp.session_id = id and cp.user_id = auth.uid())
  or owner_id = auth.uid()
);
create policy "collab_session_owner_insert" on collab_sessions for insert with check (auth.uid() = owner_id);
create policy "collab_session_owner_update" on collab_sessions for update using (auth.uid() = owner_id);

create policy "collab_participants_read" on collab_participants for select using (
  exists (select 1 from collab_participants cp2 where cp2.session_id = session_id and cp2.user_id = auth.uid())
);

create policy "collab_layers_participant_read" on collab_layers for select using (
  exists (select 1 from collab_participants cp where cp.session_id = collab_layers.session_id and cp.user_id = auth.uid())
);
create policy "collab_layers_editor_write" on collab_layers for insert with check (
  exists (select 1 from collab_participants cp where cp.session_id = collab_layers.session_id and cp.user_id = auth.uid() and cp.role in ('owner','editor'))
);
create policy "collab_layers_editor_update" on collab_layers for update using (
  exists (select 1 from collab_participants cp where cp.session_id = collab_layers.session_id and cp.user_id = auth.uid() and cp.role in ('owner','editor'))
);

create policy "collab_comments_participant_read" on collab_comments for select using (
  exists (select 1 from collab_participants cp where cp.session_id = collab_comments.session_id and cp.user_id = auth.uid())
);
create policy "collab_comments_participant_insert" on collab_comments for insert with check (
  exists (select 1 from collab_participants cp where cp.session_id = collab_comments.session_id and cp.user_id = auth.uid())
);

create policy "collab_versions_participant_read" on collab_versions for select using (
  exists (select 1 from collab_participants cp where cp.session_id = collab_versions.session_id and cp.user_id = auth.uid())
);

create policy "spaces_public_read" on spaces for select using (true);
create policy "spaces_host_insert" on spaces for insert with check (auth.uid() = host_id);
create policy "spaces_host_update" on spaces for update using (auth.uid() = host_id);

create policy "space_speakers_public_read" on space_speakers for select using (true);

-- ============================================================================
-- REALTIME — enable replication for live-collaboration tables
-- ============================================================================
alter publication supabase_realtime add table collab_layers;
alter publication supabase_realtime add table collab_comments;
alter publication supabase_realtime add table collab_participants;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table spaces;
alter publication supabase_realtime add table space_speakers;
