// Predefined roles and interest tags for v1. Not editable by users.
// Keep this file as the single source of truth — change here to update everywhere.

export const ROLES = ["Founder", "Builder", "Investor", "Curious"] as const;
export type Role = (typeof ROLES)[number];

export const INTEREST_TAGS = [
  "AI",
  "Fintech",
  "Dev",
  "Design",
  "Growth",
  "Hardware",
  "Web3",
  "Looking for cofounder",
  "Looking for work",
  "Hiring",
  "Looking for users/feedback",
] as const;
export type InterestTag = (typeof INTEREST_TAGS)[number];

// Max interest tags a participant can select.
export const MAX_TAGS = 3;

// Stable color per role, used to tint nodes in the graph (dark/electric palette).
export const ROLE_COLORS: Record<Role, string> = {
  Founder: "#ff4d8d", // electric pink
  Builder: "#00e5ff", // electric cyan
  Investor: "#b388ff", // electric violet
  Curious: "#7CFFB2", // electric green
};

export const DEFAULT_NODE_COLOR = "#00e5ff";

export function roleColor(role: string | null | undefined): string {
  if (role && role in ROLE_COLORS) {
    return ROLE_COLORS[role as Role];
  }
  return DEFAULT_NODE_COLOR;
}
