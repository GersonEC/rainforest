// Public-safe data shapes shared across server and client.

// Event shape that is safe to send to the browser (NO host_token).
export type PublicEvent = {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
};

// Attendee row as exposed to clients. Mirrors the DB columns that are
// readable by the anon role (hidden rows are filtered out before reaching here).
export type Attendee = {
  id: string;
  event_id: string;
  name: string;
  photo_url: string | null;
  building: string | null;
  looking_for: string | null;
  contact: string | null;
  role: string | null;
  tags: string[];
  created_at: string;
};

// Payload submitted from the join / edit form.
export type AttendeeInput = {
  name: string;
  building: string;
  looking_for: string;
  contact: string;
  role: string;
  tags: string[];
  consent: boolean;
};
