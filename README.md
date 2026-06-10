# Event Networking Graph (v1)

Mobile-first, no-login web app for events. Attendees scan a QR, fill a short
self-declared card (with a self-service photo), and appear in real time as nodes in a
force-directed graph — visible both on their phone and on the projector screen. The one
hypothesis this MVP validates: **how many people actually fill the "cosa cerco stasera"
field.**

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4** + **shadcn/ui**
- **Supabase**: Postgres + Realtime + Storage
- **Graph**: `react-force-graph-2d` (dynamic, client-only)
- No participant auth — identity is a `session_token` in `localStorage`.

## Surfaces

| Route | Purpose |
| --- | --- |
| `/` | Landing → link to host |
| `/host` | Create an event, get QR + projector link, moderate cards |
| `/e/[slug]` | Participant phone view: live graph + join form + tap-to-open card |
| `/e/[slug]/screen` | Read-only projector view: fullscreen graph, `PERSONE LIVE · N`, entrance spotlight |

## Setup

1. Create a Supabase project and apply the schema. See
   [`supabase/README.md`](supabase/README.md) for the full guide (migration, RLS,
   storage bucket, and the 48h `pg_cron` auto-purge job).
2. Create `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only
   ```

3. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

4. Open `/host`, create an event, then open the participant link on a phone and the
   projector link on a big screen.

## Architecture notes

- **Writes are server-side.** All inserts/updates/moderation go through Next.js server
  actions ([`app/e/[slug]/actions.ts`](app/e/%5Bslug%5D/actions.ts),
  [`app/host/actions.ts`](app/host/actions.ts)) using the **service role** key, which
  enforce `session_token` ownership and mandatory consent. The browser only ever uses the
  **anon** key, for reads + Realtime.
- **Edges are pure tag string-match** (v1) — built in [`lib/graph.ts`](lib/graph.ts).
  Two attendees sharing ≥1 tag get a thin edge. This is isolated so v1.1 can swap in
  semantic similarity without touching the UI.
- **Tags/roles config** lives in one editable file:
  [`lib/config/tags.ts`](lib/config/tags.ts).
- **Privacy**: only first-party self-declared data, mandatory consent before submit,
  cards visible only within the event page, no external enrichment, 48h auto-purge.
