"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  CalendarIcon,
  Copy,
  Loader2,
  Monitor,
  QrCode,
  ShieldAlert,
  Trash2,
  EyeOff,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  createEvent,
  listAttendeesForHost,
  moderateAttendee,
  type HostAttendee,
} from "./actions";

type HostEvent = { slug: string; name: string; host_token: string };

const STORAGE_KEY = "eng_host_events";

function toLocalDateTimeInput(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function minDateTimeLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return toLocalDateTimeInput(now);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDate(date: Date | undefined): string {
  if (!date) return "Select a date";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function combineDateAndTime(date: Date | undefined, time: string): string {
  if (!date || !time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return toLocalDateTimeInput(combined);
}

function isSameLocalDay(a: Date | undefined, b: Date): boolean {
  return (
    !!a &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function loadEvents(): HostEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HostEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: HostEvent[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export default function HostClient() {
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [time, setTime] = useState("10:00");
  const [pending, startTransition] = useTransition();
  const minDateTime = minDateTimeLocal();
  const eventDate = combineDateAndTime(selectedDate, time);
  const timeMin = isSameLocalDay(selectedDate, new Date())
    ? minDateTime.slice(11, 16)
    : undefined;

  useEffect(() => {
    // Load events persisted by this host on mount only (client-side localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents(loadEvents());
  }, []);

  function create() {
    if (!name.trim()) {
      toast.error("Enter the event name.");
      return;
    }
    if (eventDate && eventDate < minDateTime) {
      toast.error("The event date cannot be in the past.");
      return;
    }
    startTransition(async () => {
      const res = await createEvent(name.trim(), eventDate || null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const next = [
        { slug: res.slug, name: res.name, host_token: res.host_token },
        ...events.filter((e) => e.slug !== res.slug),
      ];
      setEvents(next);
      saveEvents(next);
      setName("");
      setSelectedDate(undefined);
      setTime("10:00");
      toast.success("Event created.");
    });
  }

  return (
    <div className="min-h-dvh bg-[#05070d] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Create an event</h1>
          <p className="mt-1 text-sm text-white/50">
            Generate a QR code for participants and a projector link.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/3 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Founders Night Milan"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-date">
              Date and time <span className="text-white/40">(for 48h auto-deletion)</span>
            </Label>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="event-date"
                    variant="outline"
                    className={cn(
                      "h-10 justify-start border-white/15 bg-white/5 text-left font-normal text-white hover:bg-white/10",
                      !selectedDate && "text-white/45",
                    )}
                  >
                    <CalendarIcon className="size-4 text-cyan-300" />
                    {formatDate(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto border-white/10 bg-[#0a0e18] p-0 text-white"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(day) => day < startOfToday()}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <Input
                aria-label="Event time"
                type="time"
                value={time}
                min={timeMin}
                onChange={(e) => setTime(e.target.value)}
                className="scheme-dark"
              />
            </div>
          </div>
          <Button
            onClick={create}
            disabled={pending}
            className="h-11 bg-cyan-400 font-semibold text-black hover:bg-cyan-300"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create event
          </Button>
        </div>

        {events.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-white/40">
              Your events
            </h2>
            {events.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
        )}
      </div>
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}

type CardLinks = { joinUrl: string; screenUrl: string; qr: string | null };

function EventCard({ event }: { event: HostEvent }) {
  const [links, setLinks] = useState<CardLinks | null>(null);
  const [showMod, setShowMod] = useState(false);

  useEffect(() => {
    const origin = window.location.origin;
    const joinUrl = `${origin}/e/${event.slug}`;
    const screenUrl = `${origin}/e/${event.slug}/screen`;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((qr) => setLinks({ joinUrl, screenUrl, qr }))
      .catch(() => setLinks({ joinUrl, screenUrl, qr: null }));
  }, [event.slug]);

  const joinUrl = links?.joinUrl ?? "";
  const screenUrl = links?.screenUrl ?? "";
  const qr = links?.qr ?? null;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied."),
      () => toast.error("Could not copy."),
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/3 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{event.name}</h3>
          <p className="truncate text-xs text-white/40">/{event.slug}</p>
        </div>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt={`QR ${event.name}`}
            className="size-28 shrink-0 rounded-lg bg-white p-1"
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <LinkRow icon={<QrCode className="size-4" />} label="Participant link" url={joinUrl} onCopy={copy} />
        <LinkRow icon={<Monitor className="size-4" />} label="Projector link" url={screenUrl} onCopy={copy} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <a href={joinUrl} target="_blank" rel="noopener noreferrer">Open event</a>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <a href={screenUrl} target="_blank" rel="noopener noreferrer">Open projector</a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMod((v) => !v)}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <ShieldAlert className="size-4" />
          Moderation
        </Button>
      </div>

      {showMod && <Moderation event={event} />}
    </div>
  );
}

function LinkRow({
  icon,
  label,
  url,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      <span className="text-cyan-300">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-white/35">{label}</div>
        <div className="truncate text-xs text-white/70">{url}</div>
      </div>
      <button
        type="button"
        onClick={() => onCopy(url)}
        className="shrink-0 rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function Moderation({ event }: { event: HostEvent }) {
  const [attendees, setAttendees] = useState<HostAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listAttendeesForHost(event.slug, event.host_token)
      .then((res) => {
        if (res.ok) setAttendees(res.attendees);
        else toast.error(res.error);
      })
      .finally(() => setLoading(false));
  }, [event.slug, event.host_token]);

  // Initial load: only touch state inside async callbacks (loading starts true).
  useEffect(() => {
    let active = true;
    listAttendeesForHost(event.slug, event.host_token)
      .then((res) => {
        if (!active) return;
        if (res.ok) setAttendees(res.attendees);
        else toast.error(res.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [event.slug, event.host_token]);

  function act(id: string, action: "hide" | "delete") {
    moderateAttendee(event.slug, event.host_token, id, action).then((res) => {
      if (res.ok) {
        toast.success(action === "delete" ? "Deleted." : "Hidden.");
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function unhide(id: string) {
    // Unhide isn't a dedicated action; re-show by toggling hidden via a delete+? Not needed in v1.
    // Kept simple: only hide/delete are supported. This is a no-op placeholder.
    void id;
    toast.info("To restore, ask the participant to join again.");
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Participants ({attendees.length})
        </span>
        <button
          type="button"
          onClick={refresh}
          className="text-xs text-cyan-300 hover:underline"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>
      {attendees.length === 0 && !loading && (
        <p className="text-xs text-white/40">No participants yet.</p>
      )}
      {attendees.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 rounded-md border border-white/5 bg-white/2 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white/90">
              {a.name}
              {a.hidden && <span className="ml-2 text-xs text-amber-400">hidden</span>}
            </div>
            {a.looking_for && (
              <div className="truncate text-xs text-white/45">{a.looking_for}</div>
            )}
          </div>
          {a.hidden ? (
            <button
              type="button"
              onClick={() => unhide(a.id)}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              title="Restore"
            >
              <Eye className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => act(a.id, "hide")}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              title="Hide"
            >
              <EyeOff className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => act(a.id, "delete")}
            className="rounded-md p-1.5 text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
