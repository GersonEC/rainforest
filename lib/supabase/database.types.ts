// Hand-written schema types so the Supabase client infers row/insert/update
// shapes (otherwise queries are typed as `never`). Keep in sync with
// supabase/migrations/0001_init.sql.

type EventRow = {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  host_token: string | null;
  created_at: string;
};

type AttendeeRow = {
  id: string;
  event_id: string;
  session_token: string;
  name: string;
  photo_url: string | null;
  building: string | null;
  looking_for: string | null;
  contact: string | null;
  role: string | null;
  tags: string[];
  consent: boolean;
  hidden: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: Partial<EventRow> & Pick<EventRow, "slug" | "name">;
        Update: Partial<EventRow>;
        Relationships: [];
      };
      attendees: {
        Row: AttendeeRow;
        Insert: Partial<AttendeeRow> &
          Pick<AttendeeRow, "event_id" | "session_token" | "name">;
        Update: Partial<AttendeeRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
