import { INTEREST_TAGS, MAX_TAGS, ROLES } from "./config/tags";

export function isValidRole(role: string): boolean {
  return (ROLES as readonly string[]).includes(role);
}

// Keep only known interest tags, dedupe, cap at MAX_TAGS.
export function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const allowed = new Set<string>(INTEREST_TAGS as readonly string[]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    if (typeof t === "string" && allowed.has(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
      if (out.length >= MAX_TAGS) break;
    }
  }
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function randomSuffix(len = 4): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}
