import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Service-role client. SERVER ONLY — bypasses RLS. Never import in client code.
let admin: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
    );
  }

  admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export const ATTENDEE_PHOTOS_BUCKET = "attendee-photos";
