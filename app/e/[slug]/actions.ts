"use server";

import { ATTENDEE_PHOTOS_BUCKET, getAdminClient } from "@/lib/supabase/admin";
import { isValidRole, sanitizeTags } from "@/lib/validate";
import type { Attendee } from "@/lib/types";

const ATTENDEE_COLUMNS =
  "id, event_id, name, photo_url, building, looking_for, contact, role, tags, created_at";

const MAX_PHOTO_BYTES = 6 * 1024 * 1024; // 6 MB

export type JoinResult =
  | { ok: true; attendee: Attendee }
  | { ok: false; error: string };

function extFromType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

// Uploads a user-provided photo to Storage and returns its public URL.
async function uploadPhoto(eventId: string, photo: File): Promise<string | null> {
  if (!photo || photo.size === 0) return null;
  if (!photo.type.startsWith("image/")) return null;
  if (photo.size > MAX_PHOTO_BYTES) return null;

  const admin = getAdminClient();
  const path = `${eventId}/${crypto.randomUUID()}.${extFromType(photo.type)}`;
  const bytes = new Uint8Array(await photo.arrayBuffer());

  const { error } = await admin.storage
    .from(ATTENDEE_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: photo.type, upsert: false });

  if (error) return null;

  const { data } = admin.storage.from(ATTENDEE_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}

type ParsedForm = {
  eventId: string;
  sessionToken: string;
  name: string;
  building: string;
  looking_for: string;
  contact: string;
  role: string;
  tags: string[];
  consent: boolean;
  photo: File | null;
};

function parseForm(formData: FormData): ParsedForm {
  let tags: string[] = [];
  const rawTags = formData.get("tags");
  if (typeof rawTags === "string" && rawTags) {
    try {
      tags = sanitizeTags(JSON.parse(rawTags));
    } catch {
      tags = [];
    }
  }
  const photo = formData.get("photo");
  return {
    eventId: String(formData.get("event_id") ?? ""),
    sessionToken: String(formData.get("session_token") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    building: String(formData.get("building") ?? "").trim(),
    looking_for: String(formData.get("looking_for") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    tags,
    consent: formData.get("consent") === "true",
    photo: photo instanceof File ? photo : null,
  };
}

// Insert a new attendee. Consent is mandatory and enforced here.
export async function joinEvent(formData: FormData): Promise<JoinResult> {
  const f = parseForm(formData);

  if (!f.eventId || !f.sessionToken) return { ok: false, error: "Invalid session." };
  if (!f.name) return { ok: false, error: "Name is required." };
  if (!f.consent) return { ok: false, error: "Consent is required." };
  if (f.role && !isValidRole(f.role)) return { ok: false, error: "Invalid role." };

  const admin = getAdminClient();

  const photoUrl = f.photo ? await uploadPhoto(f.eventId, f.photo) : null;

  const { data, error } = await admin
    .from("attendees")
    .insert({
      event_id: f.eventId,
      session_token: f.sessionToken,
      name: f.name,
      photo_url: photoUrl,
      building: f.building || null,
      looking_for: f.looking_for || null,
      contact: f.contact || null,
      role: f.role || null,
      tags: f.tags,
      consent: true,
    })
    .select(ATTENDEE_COLUMNS)
    .single();

  if (error || !data) return { ok: false, error: "Could not join. Try again." };
  return { ok: true, attendee: data as unknown as Attendee };
}

// Update the row owned by this session_token only.
export async function updateOwnAttendee(formData: FormData): Promise<JoinResult> {
  const f = parseForm(formData);

  if (!f.eventId || !f.sessionToken) return { ok: false, error: "Invalid session." };
  if (!f.name) return { ok: false, error: "Name is required." };
  if (f.role && !isValidRole(f.role)) return { ok: false, error: "Invalid role." };

  const admin = getAdminClient();

  // Only replace the photo when a new one is provided.
  let newPhotoUrl: string | null = null;
  if (f.photo) {
    newPhotoUrl = await uploadPhoto(f.eventId, f.photo);
  }

  const update = {
    name: f.name,
    building: f.building || null,
    looking_for: f.looking_for || null,
    contact: f.contact || null,
    role: f.role || null,
    tags: f.tags,
    ...(newPhotoUrl ? { photo_url: newPhotoUrl } : {}),
  };

  const { data, error } = await admin
    .from("attendees")
    .update(update)
    .eq("event_id", f.eventId)
    .eq("session_token", f.sessionToken)
    .select(ATTENDEE_COLUMNS)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Update failed." };
  return { ok: true, attendee: data as unknown as Attendee };
}
