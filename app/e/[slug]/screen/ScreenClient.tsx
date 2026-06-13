"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { getBrowserClient } from "@/lib/supabase/browser";
import { roleColor } from "@/lib/config/tags";
import type { Attendee, PublicEvent } from "@/lib/types";

const GraphCanvas = dynamic(() => import("@/components/graph/GraphCanvas"), {
  ssr: false,
});

type Row = Record<string, unknown>;

function mapRow(row: Row): Attendee {
  return {
    id: String(row.id),
    event_id: String(row.event_id),
    name: String(row.name ?? ""),
    photo_url: (row.photo_url as string | null) ?? null,
    building: (row.building as string | null) ?? null,
    looking_for: (row.looking_for as string | null) ?? null,
    contact: (row.contact as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export default function ScreenClient({
  event,
  initialAttendees,
}: {
  event: PublicEvent;
  initialAttendees: Attendee[];
}) {
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [spotlight, setSpotlight] = useState<Attendee | null>(null);
  const spotlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entranceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flagEntrance = useCallback((id: string) => {
    setNewNodeIds((prev) => new Set(prev).add(id));
    const existing = entranceTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setNewNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      entranceTimers.current.delete(id);
    }, 3000);
    entranceTimers.current.set(id, t);
  }, []);

  const showSpotlight = useCallback((attendee: Attendee) => {
    setSpotlight(attendee);
    if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    spotlightTimer.current = setTimeout(() => setSpotlight(null), 6000);
  }, []);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`screen:${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendees",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Row;
            if (oldRow?.id) {
              setAttendees((prev) => prev.filter((a) => a.id !== String(oldRow.id)));
            }
            return;
          }
          const row = payload.new as Row;
          if (!row?.id) return;
          if (row.hidden === true) {
            setAttendees((prev) => prev.filter((a) => a.id !== String(row.id)));
            return;
          }
          const mapped = mapRow(row);
          setAttendees((prev) => {
            const idx = prev.findIndex((a) => a.id === mapped.id);
            if (idx === -1) return [...prev, mapped];
            const next = prev.slice();
            next[idx] = mapped;
            return next;
          });
          if (payload.eventType === "INSERT") {
            flagEntrance(mapped.id);
            showSpotlight(mapped);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, flagEntrance, showSpotlight]);

  useEffect(() => {
    const timers = entranceTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      if (spotlightTimer.current) clearTimeout(spotlightTimer.current);
    };
  }, []);

  const spotlightColor = useMemo(
    () => (spotlight ? roleColor(spotlight.role) : "#00e5ff"),
    [spotlight],
  );

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#04060c] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 -top-1/4 size-[70%] rounded-full bg-cyan-500/12 blur-[160px]" />
        <div className="absolute -right-1/4 -bottom-1/4 size-[70%] rounded-full bg-fuchsia-500/12 blur-[160px]" />
      </div>

      {/* Fullscreen graph (read-only) */}
      <div className="absolute inset-0 z-0">
        <GraphCanvas
          attendees={attendees}
          selectedId={null}
          newNodeIds={newNodeIds}
          spotlightId={spotlight?.id ?? null}
          interactive={false}
          big
        />
      </div>

      {/* Event name */}
      <div className="absolute left-10 top-8 z-10">
        <h1 className="text-2xl font-semibold tracking-tight text-white/90">{event.name}</h1>
      </div>

      {/* Live counter */}
      <div className="absolute right-10 top-8 z-10 text-right">
        <div className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300/80">
          Live People
        </div>
        <div className="text-7xl font-bold leading-none text-white tabular-nums [text-shadow:0_0_40px_rgba(0,229,255,0.55)]">
          {attendees.length}
        </div>
      </div>

      {attendees.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="text-xl text-white/40">Waiting for the first participants...</p>
        </div>
      )}

      {/* Spotlight on the latest entrant */}
      {spotlight && (
        <div
          key={spotlight.id}
          className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-2xl border bg-black/40 px-6 py-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-6 duration-500"
          style={{ borderColor: spotlightColor, boxShadow: `0 0 50px -10px ${spotlightColor}` }}
        >
          <div
            className="size-14 shrink-0 overflow-hidden rounded-full border-2"
            style={{ borderColor: spotlightColor }}
          >
            {spotlight.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={spotlight.photo_url}
                alt={spotlight.name}
                className="size-full object-cover"
              />
            ) : (
              <div
                className="flex size-full items-center justify-center text-xl font-semibold"
                style={{ color: spotlightColor }}
              >
                {spotlight.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: spotlightColor }}>
              Just joined
            </div>
            <div className="text-xl font-semibold text-white">{spotlight.name}</div>
            {spotlight.looking_for && (
              <div className="max-w-md truncate text-sm text-white/60">
                Looking for: {spotlight.looking_for}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
