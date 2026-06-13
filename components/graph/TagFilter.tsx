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
                ? "bg-[#143222]/70"
                : "border-[#ABD3B6]/15 text-[#9BB7A3] hover:border-[#ABD3B6]/30 hover:text-[#ECF8EF]/80",
            )}
          >
            {role}
          </button>
        );
      })}
      <span className="mx-0.5 shrink-0 self-center text-[#ABD3B6]/20">|</span>
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
                ? "border-[#7CFF8A]/70 bg-[#7CFF8A]/10 text-[#7CFF8A]"
                : "border-[#ABD3B6]/15 text-[#9BB7A3] hover:border-[#ABD3B6]/30 hover:text-[#ECF8EF]/80",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
