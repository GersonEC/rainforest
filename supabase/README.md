# Supabase setup — Event Networking Graph

This app uses Supabase for Postgres, Realtime, and Storage. There is **no participant
auth**: identity is a `session_token` stored in `localStorage`. All writes go through
Next.js server actions using the **service role** key; the browser uses only the **anon**
key for reads + Realtime.

## 1. Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never exposed to the client
```

Find these under **Project Settings -> API** in the Supabase dashboard.

## 2. Apply the migration

Either paste the contents of [`migrations/0001_init.sql`](migrations/0001_init.sql) into the
Supabase **SQL Editor** and run it, or use the CLI:

```bash
supabase db push
# or, for a remote project:
supabase db execute --file supabase/migrations/0001_init.sql
```

This creates:

- `events` and `attendees` tables (+ indexes).
- RLS: anon can `SELECT` only non-hidden `attendees`; `events` has no anon access
  (slug lookups + `host_token` stay server-side).
- The `attendees` table added to the `supabase_realtime` publication.
- A public-read `attendee-photos` storage bucket (uploads via service role only).
- The `purge_old_attendees()` function + an hourly `pg_cron` job.

## 3. Auto-purge job (GDPR)

The migration installs the `pg_cron` extension and schedules:

| Job | Schedule | Action |
| --- | --- | --- |
| `purge_old_attendees` | `0 * * * *` (hourly) | Deletes every attendee whose event ended more than **48 hours** ago (`now() > event_date + interval '48 hours'`). |

Verify / inspect:

```sql
select * from cron.job;                              -- scheduled jobs
select * from cron.job_run_details order by start_time desc limit 10;  -- run history
```

To run the purge manually: `select public.purge_old_attendees();`

> Note: `pg_cron` must be enabled for the project. On Supabase it is available by
> default; if `create extension pg_cron` fails, enable it under
> **Database -> Extensions** first, then re-run the migration.

## 4. Realtime

The phone (`/e/[slug]`) and projector (`/e/[slug]/screen`) views subscribe to
`postgres_changes` (INSERT/UPDATE/DELETE) on `public.attendees`, filtered by `event_id`.
No extra configuration is needed beyond the publication line in the migration.
