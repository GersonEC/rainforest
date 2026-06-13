// Predefined roles and interest tags for v1. Not editable by users.
// Keep this file as the single source of truth — change here to update everywhere.

export const ROLES = ["Builder", "Investor", "Curious", "Community Manager"] as const;
export type Role = (typeof ROLES)[number];

export const INTEREST_TAGS = [
  "AI",
  "EdTech",
  "FinTech",
  "HealthTech",
  "ClimateTech",
  "DevTools",
  "B2B SaaS",
  "Consumer",
  "Marketplace",
  "E-commerce",
  "Creator Economy",
  "HR/Future of Work",
  "Cybersecurity",
  "Web3",
  "Hardware/IoT",
  "Social Impact",
  "Other",
] as const;
export type InterestTag = (typeof INTEREST_TAGS)[number];

// Max interest tags a participant can select.
export const MAX_TAGS = 3;

// Stable color per role, used to tint nodes in the graph (dark/electric palette).
export const ROLE_COLORS: Record<Role, string> = {
  Builder: "#7CFF8A", // bioluminescent leaf
  Investor: "#F2C94C", // firefly amber
  Curious: "#5EEAD4", // rainforest water
  "Community Manager": "#C084FC", // orchid
};

export const DEFAULT_NODE_COLOR = "#7CFF8A";

export function roleColor(role: string | null | undefined): string {
  if (role && role in ROLE_COLORS) {
    return ROLE_COLORS[role as Role];
  }
  return DEFAULT_NODE_COLOR;
}
