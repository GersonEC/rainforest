import "server-only";
import { getAdminClient } from "./supabase/admin";
import type { Attendee, PublicEvent } from "./types";

// Server-side slug -> event lookup. Never exposes host_token to callers/clients.
export async function getEventBySlug(slug: string): Promise<PublicEvent | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("id, slug, name, event_date")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PublicEvent;
}

// Initial (non-hidden) attendees for an event, newest last.
export async function getAttendees(eventId: string): Promise<Attendee[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("attendees")
    .select(
      "id, event_id, name, photo_url, building, looking_for, contact, role, tags, created_at",
    )
    .eq("event_id", eventId)
    .eq("hidden", false)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Attendee[];
}
