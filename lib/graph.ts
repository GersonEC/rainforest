import type { Attendee } from "./types";

// Graph node/link shapes consumed by react-force-graph-2d.
// `react-force-graph` mutates node objects with x/y/vx/vy at runtime.
export type GraphNode = {
  id: string;
  name: string;
  role: string | null;
  tags: string[];
  photo_url: string | null;
  building: string | null;
  looking_for: string | null;
  contact: string | null;
  created_at: string;
  // runtime fields added by the force engine
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  // number of shared tags — used to weight edge opacity/strength
  weight: number;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

function sharedTagCount(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const set = new Set(a);
  let count = 0;
  for (const t of b) {
    if (set.has(t)) count += 1;
  }
  return count;
}

// Returns true when two attendees share at least one tag.
export function shareTag(a: Attendee, b: Attendee): boolean {
  return sharedTagCount(a.tags ?? [], b.tags ?? []) > 0;
}

// Build the force-graph data from attendees.
// v1: an edge exists between any two attendees sharing >= 1 tag (pure string match).
// Keep this isolated so v1.1 can swap in semantic-similarity edges without touching UI.
export function buildGraphData(attendees: Attendee[]): GraphData {
  const nodes: GraphNode[] = attendees.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    tags: a.tags ?? [],
    photo_url: a.photo_url,
    building: a.building,
    looking_for: a.looking_for,
    contact: a.contact,
    created_at: a.created_at,
  }));

  const links: GraphLink[] = [];
  for (let i = 0; i < attendees.length; i += 1) {
    for (let j = i + 1; j < attendees.length; j += 1) {
      const weight = sharedTagCount(attendees[i].tags ?? [], attendees[j].tags ?? []);
      if (weight > 0) {
        links.push({ source: attendees[i].id, target: attendees[j].id, weight });
      }
    }
  }

  return { nodes, links };
}
