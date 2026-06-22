# Nexus — Full-Stack Social Platform

A working full-stack implementation: PostgreSQL/Supabase database, Python/FastAPI backend, and a Next.js frontend with real-time collaborative content creation.

```
nexus-build/
├── database/
│   └── schema.sql          ← run this in Supabase first
├── backend/                ← FastAPI (Python)
│   └── app/
│       ├── main.py
│       ├── core/           (config, supabase client, auth deps)
│       ├── models/         (Pydantic schemas)
│       └── routers/        (auth, users, posts, collab, stories, spaces, notifications, messages)
└── frontend/                ← Next.js (TypeScript, App Router, Tailwind)
    └── src/
        ├── app/             (pages: home, login, signup, profile, collab, spaces, notifications)
        ├── components/      (Sidebar, PostCard, Composer, StoryBar, RightPanel)
        ├── lib/             (api client, supabase client, auth store, realtime hook)
        └── types/
```

## 1. Set up Supabase (database + auth)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** → paste the entire contents of `database/schema.sql` → run it.
   This creates all 17 tables, triggers for auto-updating counters (likes, followers, etc.), Row Level Security policies, and enables Realtime on the collab/chat tables.
3. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep secret — backend only)

## 2. Run the backend (FastAPI)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then fill in your Supabase values
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive Swagger API docs — every endpoint is listed there.

## 3. Run the frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase URL/anon key + backend URL
npm run dev
```

Visit `http://localhost:3000`.

## How auth works

- The frontend uses `@supabase/ssr` to sign up / log in directly against Supabase Auth (industry-standard, handles password hashing, sessions, refresh tokens for you).
- Every API request from the frontend attaches the Supabase session JWT as `Authorization: Bearer <token>`.
- FastAPI verifies that token with Supabase Auth (`app/core/deps.py`) and extracts the user ID — no separate auth system to maintain.
- The backend uses the Supabase **service role** key to talk to the database, so it can enforce its own authorization logic (e.g. "only the post owner can delete it") on top of the database's Row Level Security.

## How real-time collaboration works

`frontend/src/lib/useCollabRealtime.ts` opens a Supabase Realtime channel per collab session:
- **Postgres Changes** — subscribes to INSERT/UPDATE/DELETE on `collab_layers` and `collab_comments`, filtered to that session. When any contributor adds a layer via the API, every other open browser receives the change within ~100–200ms.
- **Presence** — broadcasts live cursor positions between contributors on the same canvas.

No WebSocket server to run yourself — Supabase manages this.

## Deploying

**Frontend → Vercel**
```bash
cd frontend
vercel
```
Set the same env vars from `.env.local` in the Vercel project settings.

**Backend → Railway** (or Render / Fly.io / any Docker host)
```bash
cd backend
railway up
```
`Dockerfile` and `railway.json` are included. Set the env vars from `.env.example` in your Railway project settings, and update `CORS_ORIGINS` to your deployed Vercel URL.

After both are deployed, update `NEXT_PUBLIC_API_URL` in Vercel to point at your live backend URL, and redeploy the frontend.

## What's implemented

- **Auth** — signup, login, profile editing, Supabase-backed sessions
- **Posts** — create, edit, delete, like, comment, tag-based feed filtering (For You / Following / Trending)
- **Follows** — follow/unfollow, follower/following lists, suggested users
- **Stories** — 24-hour expiring stories with view tracking
- **Collab mode** — multi-user canvas with layers, live cursors, pinned comments, version history with restore, and publish-to-post with contributor credit
- **Spaces** — live audio-room listings, join/leave, host controls
- **Notifications** — likes, comments, follows, new posts, collab invites
- **Direct messages** — 1:1 conversations

## What you'd still need for production

- Real media upload/storage (Supabase Storage is the natural fit — not wired up here, `media_url` fields are placeholders)
- Rate limiting and abuse moderation
- Push notifications (web push or a mobile app)
- Actual AI integration for the "AI Studio" features (caption generation, composition suggestions) — currently UI-only; would call an LLM API server-side
