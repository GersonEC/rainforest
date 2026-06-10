"use client";

import { INTEREST_TAGS, ROLES, roleColor } from "@/lib/config/tags";
import { cn } from "@/lib/utils";

export type Filter = { role: string | null; tag: string | null };

type TagFilterProps = {
  filter: Filter;
  onChange: (filter: Filter) => void;
};

// Selectable role/tag chips above the graph. Selecting again clears it.
export default function TagFilter({ filter, onChange }: TagFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ROLES.map((role) => {
        const active = filter.role === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange({ ...filter, role: active ? null : role })}
            style={active ? { borderColor: roleColor(role), color: roleColor(role) } : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-white/5"
                : "border-white/10 text-white/55 hover:border-white/25 hover:text-white/80",
            )}
          >
            {role}
          </button>
        );
      })}
      <span className="mx-0.5 shrink-0 self-center text-white/15">|</span>
      {INTEREST_TAGS.map((tag) => {
        const active = filter.tag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onChange({ ...filter, tag: active ? null : tag })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-cyan-400/70 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 text-white/55 hover:border-white/25 hover:text-white/80",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
