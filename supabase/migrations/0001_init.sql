-- Event Networking Graph (v1) — initial schema, RLS, realtime, storage, and auto-purge.
--
-- Security model:
--   * All writes (join / edit-own / moderation) go through Next.js server actions
--     that use the SERVICE ROLE key, which bypasses RLS. The browser only ever uses
--     the ANON key for reads + Realtime.
--   * No participant auth: identity is a `session_token` stored in localStorage and
--     enforced in server-side code (not by RLS).

-- Extensions needed for the scheduled auto-purge job.
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  event_date timestamptz,
  host_token text,            -- secret, used for host moderation. Never sent to clients.
  created_at timestamptz default now()
);

create index if not exists events_slug_idx on public.events (slug);

-- ---------------------------------------------------------------------------
-- attendees
-- ---------------------------------------------------------------------------
create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  session_token text not null,   -- device-based identity for edit-own
  name text not null,
  photo_url text,                -- Supabase Storage; user-provided photo only
  building text,
  looking_for text,              -- "what are you looking for" — key field to measure
  contact text,
  role text,                     -- enum-like: Founder | Builder | Investor | Curious
  tags text[] default '{}',
  consent boolean not null default false,
  hidden boolean not null default false,   -- host moderation (soft hide)
  created_at timestamptz default now()
);

create index if not exists attendees_event_id_idx on public.attendees (event_id);
create index if not exists attendees_event_session_idx on public.attendees (event_id, session_token);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.attendees enable row level security;

-- events: no anonymous access at all. Slug lookups happen server-side with the
-- service role, and host_token must never leak to the browser. (Service role
-- bypasses RLS, so omitting policies = anon/authenticated have zero access.)

-- attendees: anonymous clients may READ only non-hidden rows (needed for the
-- initial graph load fallback and Realtime). All writes are denied for anon and
-- go exclusively through the service role.
drop policy if exists "attendees_anon_select_visible" on public.attendees;
create policy "attendees_anon_select_visible"
  on public.attendees
  for select
  to anon, authenticated
  using (hidden = false);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- Stream INSERT/UPDATE/DELETE on attendees so phones and the projector update live.
alter publication supabase_realtime add table public.attendees;

-- ---------------------------------------------------------------------------
-- Storage bucket for user-provided photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attendee-photos', 'attendee-photos', true)
on conflict (id) do nothing;

-- Public read of photo objects (graph nodes render the image by URL).
-- Uploads/deletes happen via the service role only (server actions).
drop policy if exists "attendee_photos_public_read" on storage.objects;
create policy "attendee_photos_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'attendee-photos');

-- ---------------------------------------------------------------------------
-- Auto-purge (GDPR): delete all attendees 48h after the event date.
-- ---------------------------------------------------------------------------
create or replace function public.purge_old_attendees()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.attendees
  where event_id in (
    select id from public.events
    where event_date is not null
      and now() > event_date + interval '48 hours'
  );
$$;

-- Run hourly. The job is idempotent and only removes rows past the 48h window.
select cron.schedule(
  'purge_old_attendees',
  '0 * * * *',
  $$select public.purge_old_attendees();$$
);
