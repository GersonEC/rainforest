"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { INTEREST_TAGS, MAX_TAGS, ROLES, roleColor } from "@/lib/config/tags";
import { getSessionToken } from "@/lib/session";
import { joinEvent, updateOwnAttendee } from "@/app/e/[slug]/actions";
import type { Attendee } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONSENT_TEXT =
  "Compilando, accetti che la tua scheda sia visibile agli altri partecipanti di questo evento. I dati vengono cancellati 48 ore dopo l'evento.";

type JoinFormProps = {
  eventId: string;
  mode: "join" | "edit";
  initial?: Attendee | null;
  onDone: (attendee: Attendee) => void;
};

export default function JoinForm({ eventId, mode, initial, onDone }: JoinFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [building, setBuilding] = useState(initial?.building ?? "");
  const [lookingFor, setLookingFor] = useState(initial?.looking_for ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [role, setRole] = useState<string>(initial?.role ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [consent, setConsent] = useState(mode === "edit");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.photo_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function toggleTag(tag: string) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) {
        toast.warning(`Massimo ${MAX_TAGS} tag.`);
        return prev;
      }
      return [...prev, tag];
    });
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Il nome è obbligatorio.");
      return;
    }
    if (mode === "join" && !consent) {
      toast.error("Devi accettare il consenso per entrare.");
      return;
    }

    const fd = new FormData();
    fd.set("event_id", eventId);
    fd.set("session_token", getSessionToken());
    fd.set("name", name.trim());
    fd.set("building", building.trim());
    fd.set("looking_for", lookingFor.trim());
    fd.set("contact", contact.trim());
    fd.set("role", role);
    fd.set("tags", JSON.stringify(tags));
    fd.set("consent", String(consent));
    if (photoFile) fd.set("photo", photoFile);

    startTransition(async () => {
      const res = mode === "join" ? await joinEvent(fd) : await updateOwnAttendee(fd);
      if (res.ok) {
        toast.success(mode === "join" ? "Sei nel grafo!" : "Scheda aggiornata.");
        onDone(res.attendee);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Photo */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-white/40 transition-colors hover:border-cyan-400/60"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Anteprima" className="size-full object-cover" />
          ) : (
            <Camera className="size-7" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={onPickPhoto}
        />
        <span className="text-xs text-white/40">Scatta un selfie o carica una foto</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Chi sei</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Il tuo nome"
          maxLength={80}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="building">Cosa stai costruendo</Label>
        <Textarea
          id="building"
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="Un'app, un fondo, una community…"
          rows={2}
          maxLength={280}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="looking_for">Cosa cerchi stasera</Label>
        <Textarea
          id="looking_for"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
          placeholder="Un cofounder, clienti, un lavoro, feedback…"
          rows={2}
          maxLength={280}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact">Come ti contatto</Label>
        <Input
          id="contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="LinkedIn, sito, email, handle…"
          maxLength={200}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Ruolo</Label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(active ? "" : r)}
                style={active ? { borderColor: roleColor(r), color: roleColor(r) } : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-white/5"
                    : "border-white/10 text-white/55 hover:border-white/25",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          Interessi <span className="text-white/40">(max {MAX_TAGS})</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-cyan-400/70 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 text-white/55 hover:border-white/25",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "join" && (
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            className="mt-0.5"
          />
          <span className="text-xs leading-relaxed text-white/65">{CONSENT_TEXT}</span>
        </label>
      )}

      <Button
        onClick={submit}
        disabled={pending || (mode === "join" && !consent)}
        className="h-12 w-full bg-cyan-400 text-base font-semibold text-black hover:bg-cyan-300"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {mode === "join" ? "Entra nel grafo" : "Salva modifiche"}
      </Button>
    </div>
  );
}
