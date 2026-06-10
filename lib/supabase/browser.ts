import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Anonymous client for the browser: reads + Realtime only.
// Writes are denied by RLS and must go through server actions (service role).
let client: ReturnType<typeof createClient<Database>> | null = null;

export function getBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.",
    );
  }

  client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}
