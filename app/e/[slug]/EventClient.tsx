"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, UserRound } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import TagFilter, { type Filter } from "@/components/graph/TagFilter";
import JoinForm from "@/components/JoinForm";
import AttendeeSheet from "@/components/AttendeeSheet";
import { getBrowserClient } from "@/lib/supabase/browser";
import { getOwnAttendeeId, setOwnAttendeeId } from "@/lib/session";
import type { Attendee, PublicEvent } from "@/lib/types";

const GraphCanvas = dynamic(() => import("@/components/graph/GraphCanvas"), {
  ssr: false,
});

type SheetState =
  | { type: "join" }
  | { type: "edit" }
  | { type: "detail"; id: string }
  | null;

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

export default function EventClient({
  event,
  initialAttendees,
}: {
  event: PublicEvent;
  initialAttendees: Attendee[];
}) {
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ role: null, tag: null });
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const entranceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    // Read persisted device identity on mount only. Kept in an effect (not lazy
    // useState) so SSR and first client render match before localStorage is read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnId(getOwnAttendeeId(event.id));
  }, [event.id]);

  const flagEntrance = useCallback((id: string) => {
    setNewNodeIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const existing = entranceTimers.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setNewNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      entranceTimers.current.delete(id);
    }, 2200);
    entranceTimers.current.set(id, t);
  }, []);

  const upsert = useCallback((row: Attendee) => {
    setAttendees((prev) => {
      const idx = prev.findIndex((a) => a.id === row.id);
      if (idx === -1) return [...prev, row];
      const next = prev.slice();
      next[idx] = row;
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Realtime: live INSERT / UPDATE / DELETE for this event.
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`attendees:${event.id}`)
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
            if (oldRow?.id) remove(String(oldRow.id));
            return;
          }
          const row = payload.new as Row;
          if (!row?.id) return;
          if (row.hidden === true) {
            remove(String(row.id));
            return;
          }
          if (payload.eventType === "INSERT") flagEntrance(String(row.id));
          upsert(mapRow(row));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, upsert, remove, flagEntrance]);

  useEffect(() => {
    const timers = entranceTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const filtered = useMemo(() => {
    return attendees.filter((a) => {
      if (filter.role && a.role !== filter.role) return false;
      if (filter.tag && !a.tags.includes(filter.tag)) return false;
      return true;
    });
  }, [attendees, filter]);

  const selectedId = sheet?.type === "detail" ? sheet.id : null;
  const selectedAttendee = useMemo(
    () => (selectedId ? attendees.find((a) => a.id === selectedId) ?? null : null),
    [attendees, selectedId],
  );
  const ownAttendee = useMemo(
    () => (ownId ? attendees.find((a) => a.id === ownId) ?? null : null),
    [attendees, ownId],
  );

  function handleJoined(attendee: Attendee) {
    setOwnAttendeeId(event.id, attendee.id);
    setOwnId(attendee.id);
    upsert(attendee);
    flagEntrance(attendee.id);
    setSheet({ type: "detail", id: attendee.id });
  }

  function handleEdited(attendee: Attendee) {
    upsert(attendee);
    setSheet({ type: "detail", id: attendee.id });
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#06110D] text-[#ECF8EF]">
      <RainforestBackground />

      {/* Top bar */}
      <header className="relative z-10 flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{event.name}</h1>
            <p className="text-xs text-[#7CFF8A]/80">
              LIVE PEOPLE · {attendees.length}
            </p>
          </div>
        </div>
        <TagFilter filter={filter} onChange={setFilter} />
      </header>

      {/* Graph */}
      <main className="relative z-0 flex-1">
        <GraphCanvas
          attendees={filtered}
          selectedId={selectedId}
          newNodeIds={newNodeIds}
          interactive
          showZoomControls
          onNodeClick={(id) => setSheet({ type: "detail", id })}
          onBackgroundClick={() => setSheet(null)}
        />
        {attendees.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="text-sm text-[#9BB7A3]/70">
              No one is in the graph yet. Be the first to join.
            </p>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <footer className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {ownAttendee ? (
          <Button
            onClick={() => setSheet({ type: "detail", id: ownAttendee.id })}
            className="h-13 w-full border border-[#ABD3B6]/15 bg-[#0F241A]/75 text-base font-semibold text-[#ECF8EF] hover:bg-[#143222]"
          >
            <UserRound className="size-5" />
            Your profile
          </Button>
        ) : (
          <Button
            onClick={() => setSheet({ type: "join" })}
            className="h-13 w-full bg-[#7CFF8A] text-base font-semibold text-[#06110D] shadow-[0_0_30px_-6px_rgba(124,255,138,0.8)] hover:bg-[#A7FFAE]"
          >
            <Plus className="size-5" />
            Join the graph
          </Button>
        )}
      </footer>

      {/* Join */}
      <Sheet
        open={sheet?.type === "join"}
        onOpenChange={(o) => !o && setSheet(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto border-[#ABD3B6]/15 bg-[#0F241A] text-[#ECF8EF]"
        >
          <SheetHeader>
            <SheetTitle className="text-[#ECF8EF]">Join the graph</SheetTitle>
            <SheetDescription>Fill out your profile. You will appear in the graph right away.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <JoinForm eventId={event.id} mode="join" onDone={handleJoined} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit */}
      <Sheet
        open={sheet?.type === "edit"}
        onOpenChange={(o) => !o && setSheet(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto border-[#ABD3B6]/15 bg-[#0F241A] text-[#ECF8EF]"
        >
          <SheetHeader>
            <SheetTitle className="text-[#ECF8EF]">Edit your profile</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            {ownAttendee && (
              <JoinForm
                eventId={event.id}
                mode="edit"
                initial={ownAttendee}
                onDone={handleEdited}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail */}
      <Sheet
        open={sheet?.type === "detail"}
        onOpenChange={(o) => !o && setSheet(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto border-[#ABD3B6]/15 bg-[#0F241A] text-[#ECF8EF]"
        >
          <SheetHeader>
            <SheetTitle className="sr-only">Participant profile</SheetTitle>
          </SheetHeader>
          {selectedAttendee && (
            <AttendeeSheet
              attendee={selectedAttendee}
              isOwn={selectedAttendee.id === ownId}
              onEdit={() => setSheet({ type: "edit" })}
            />
          )}
        </SheetContent>
      </Sheet>

      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}

function RainforestBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-22 saturate-125"
        style={{ backgroundImage: "url('/images/rainforest-graph-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-[#06110D]/72" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(6,17,13,0.25),rgba(6,17,13,0.92)_70%)]" />
      <div className="absolute -left-1/4 top-0 size-[60%] rounded-full bg-[#1FA463]/20 blur-[120px]" />
      <div className="absolute -right-1/4 bottom-0 size-[55%] rounded-full bg-[#5EEAD4]/10 blur-[120px]" />
      <div className="absolute bottom-12 left-1/3 h-20 w-20 rounded-full bg-[#F2C94C]/10 blur-[70px]" />
    </div>
  );
}
