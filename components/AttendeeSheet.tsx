"use client";

import { Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roleColor } from "@/lib/config/tags";
import type { Attendee } from "@/lib/types";

type AttendeeSheetProps = {
  attendee: Attendee;
  isOwn: boolean;
  onEdit: () => void;
};

function contactHref(contact: string): string | null {
  const c = contact.trim();
  if (!c) return null;
  if (/^https?:\/\//i.test(c)) return c;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return `mailto:${c}`;
  if (/^www\./i.test(c)) return `https://${c}`;
  return null;
}

export default function AttendeeSheet({ attendee, isOwn, onEdit }: AttendeeSheetProps) {
  const color = roleColor(attendee.role);
  const href = attendee.contact ? contactHref(attendee.contact) : null;

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <div className="flex items-center gap-4">
        <div
          className="size-16 shrink-0 overflow-hidden rounded-full border"
          style={{ borderColor: color }}
        >
          {attendee.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attendee.photo_url}
              alt={attendee.name}
              className="size-full object-cover"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center text-xl font-semibold"
              style={{ color }}
            >
              {attendee.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">{attendee.name}</h2>
          {attendee.role && (
            <span className="text-sm font-medium" style={{ color }}>
              {attendee.role}
            </span>
          )}
        </div>
      </div>

      {attendee.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attendee.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {attendee.building && (
        <Field label="Sta costruendo">{attendee.building}</Field>
      )}
      {attendee.looking_for && (
        <Field label="Cerca">{attendee.looking_for}</Field>
      )}
      {attendee.contact && (
        <Field label="Contatto">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-300 underline-offset-2 hover:underline"
            >
              {attendee.contact}
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            attendee.contact
          )}
        </Field>
      )}

      {isOwn && (
        <Button
          variant="outline"
          onClick={onEdit}
          className="mt-1 w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <Pencil className="size-4" />
          Modifica la tua scheda
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-white/40">{label}</span>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/85">{children}</p>
    </div>
  );
}
