"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { randomSuffix, slugify } from "@/lib/validate";
import type { Attendee } from "@/lib/types";

export type CreateEventResult =
  | { ok: true; slug: string; host_token: string; name: string }
  | { ok: false; error: string };

// Creates an event with a unique slug and a secret host_token (for moderation).
export async function createEvent(
  name: string,
  eventDate: string | null,
): Promise<CreateEventResult> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "Event name is required." };

  const admin = getAdminClient();
  const base = slugify(trimmed) || "event";
  const host_token = crypto.randomUUID();

  // Try a few slug candidates to avoid unique collisions.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
    const { error } = await admin
      .from("events")
      .insert({
        slug,
        name: trimmed,
        event_date: eventDate || null,
        host_token,
      });

    if (!error) {
      return { ok: true, slug, host_token, name: trimmed };
    }
    // 23505 = unique_violation -> retry with a new suffix
    if ((error as { code?: string }).code !== "23505") {
      return { ok: false, error: "Could not create the event. Try again." };
    }
  }

  return { ok: false, error: "Slug unavailable. Try again." };
}

export type ModerationResult = { ok: true } | { ok: false; error: string };

// Host moderation: hide or delete a card. Authorized via host_token.
export async function moderateAttendee(
  slug: string,
  hostToken: string,
  attendeeId: string,
  action: "hide" | "delete",
): Promise<ModerationResult> {
  const admin = getAdminClient();

  const { data: event, error: eventErr } = await admin
    .from("events")
    .select("id, host_token")
    .eq("slug", slug)
    .maybeSingle();

  if (eventErr || !event) return { ok: false, error: "Event not found." };
  if (!hostToken || event.host_token !== hostToken) {
    return { ok: false, error: "Not authorized." };
  }

  if (action === "delete") {
    const { error } = await admin
      .from("attendees")
      .delete()
      .eq("id", attendeeId)
      .eq("event_id", event.id);
    if (error) return { ok: false, error: "Delete failed." };
  } else {
    const { error } = await admin
      .from("attendees")
      .update({ hidden: true })
      .eq("id", attendeeId)
      .eq("event_id", event.id);
    if (error) return { ok: false, error: "Operation failed." };
  }

  return { ok: true };
}

export type HostAttendee = Attendee & { hidden: boolean; session_token?: never };

export type ListResult =
  | { ok: true; attendees: HostAttendee[] }
  | { ok: false; error: string };

// Returns all attendees (including hidden) for moderation. Authorized via host_token.
export async function listAttendeesForHost(
  slug: string,
  hostToken: string,
): Promise<ListResult> {
  const admin = getAdminClient();

  const { data: event, error: eventErr } = await admin
    .from("events")
    .select("id, host_token")
    .eq("slug", slug)
    .maybeSingle();

  if (eventErr || !event) return { ok: false, error: "Event not found." };
  if (!hostToken || event.host_token !== hostToken) {
    return { ok: false, error: "Not authorized." };
  }

  const { data, error } = await admin
    .from("attendees")
    .select(
      "id, event_id, name, photo_url, building, looking_for, contact, role, tags, created_at, hidden",
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });

  if (error || !data) return { ok: false, error: "Could not load attendees." };
  return { ok: true, attendees: data as unknown as HostAttendee[] };
}
