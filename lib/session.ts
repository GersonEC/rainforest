// Device-based identity for "edit own card". No auth: we store a random token
// in localStorage and pass it to server actions, which enforce ownership.

const KEY = "eng_session_token";

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(KEY);
  if (!token) {
    token = randomToken();
    window.localStorage.setItem(KEY, token);
  }
  return token;
}

// Remember which attendee row belongs to this device, per event, so the UI can
// flag "your card" without exposing session_token in the public data.
function ownKey(eventId: string): string {
  return `eng_own_${eventId}`;
}

export function getOwnAttendeeId(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ownKey(eventId));
}

export function setOwnAttendeeId(eventId: string, attendeeId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ownKey(eventId), attendeeId);
}
