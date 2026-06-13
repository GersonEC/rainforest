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
  "By submitting, you agree that your profile will be visible to other participants at this event. Your data will be deleted 48 hours after the event.";

type JoinFormProps = {
  eventId: string;
  mode: "join" | "edit";
  initial?: Attendee | null;
  onDone: (attendee: Attendee) => void;
};

type FormErrors = {
  name?: string;
  lookingFor?: string;
  role?: string;
  tags?: string;
};

export default function JoinForm({ eventId, mode, initial, onDone }: JoinFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [building, setBuilding] = useState(initial?.building ?? "");
  const [lookingFor, setLookingFor] = useState(initial?.looking_for ?? "");
  const [contact] = useState(initial?.contact ?? "");
  const [role, setRole] = useState<string>(initial?.role ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [consent, setConsent] = useState(mode === "edit");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.photo_url ?? null);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function toggleTag(tag: string) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) {
        toast.warning(`Maximum ${MAX_TAGS} tags.`);
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
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!lookingFor.trim()) {
      nextErrors.lookingFor = "Tell people what you are looking for tonight.";
    }
    if (!role) nextErrors.role = "Choose a role.";
    if (tags.length === 0) nextErrors.tags = "Choose at least one interest.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please complete the required fields.");
      return;
    }

    if (mode === "join" && !consent) {
      toast.error("You need to accept the consent notice to join.");
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
        toast.success(mode === "join" ? "You're in the graph!" : "Profile updated.");
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
          className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-[#ABD3B6]/15 bg-[#143222]/60 text-[#9BB7A3] transition-colors hover:border-[#7CFF8A]/60"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="size-full object-cover" />
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
        <span className="text-xs text-[#9BB7A3]">Take a selfie or upload a photo</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Who are you? <Required />
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="Your name"
          maxLength={80}
          aria-invalid={!!errors.name}
          className={errors.name ? "border-red-400/70" : undefined}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="building">
          What are you building? <span className="text-[#9BB7A3]">(optional)</span>
        </Label>
        <Textarea
          id="building"
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="An app, a fund, a community..."
          rows={2}
          maxLength={280}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="looking_for">
          What are you looking for tonight? <Required />
        </Label>
        <Textarea
          id="looking_for"
          value={lookingFor}
          onChange={(e) => {
            setLookingFor(e.target.value);
            setErrors((prev) => ({ ...prev, lookingFor: undefined }));
          }}
          placeholder="A cofounder, customers, a job, feedback..."
          rows={2}
          maxLength={280}
          aria-invalid={!!errors.lookingFor}
          className={errors.lookingFor ? "border-red-400/70" : undefined}
        />
        {errors.lookingFor && <FieldError>{errors.lookingFor}</FieldError>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          Role <Required />
        </Label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(active ? "" : r);
                  setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                style={active ? { borderColor: roleColor(r), color: roleColor(r) } : undefined}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[#143222]/70"
                    : "border-[#ABD3B6]/15 text-[#9BB7A3] hover:border-[#ABD3B6]/30",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
        {errors.role && <FieldError>{errors.role}</FieldError>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>
          Interests <Required /> <span className="text-[#9BB7A3]">(max {MAX_TAGS})</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  toggleTag(tag);
                  setErrors((prev) => ({ ...prev, tags: undefined }));
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-[#7CFF8A]/70 bg-[#7CFF8A]/10 text-[#7CFF8A]"
                    : "border-[#ABD3B6]/15 text-[#9BB7A3] hover:border-[#ABD3B6]/30",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
        {errors.tags && <FieldError>{errors.tags}</FieldError>}
      </div>

      {mode === "join" && (
        <label className="flex items-start gap-3 rounded-lg border border-[#ABD3B6]/15 bg-[#143222]/55 p-3">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            className="mt-0.5"
          />
          <span className="text-xs leading-relaxed text-[#9BB7A3]">{CONSENT_TEXT}</span>
        </label>
      )}

      <Button
        onClick={submit}
        disabled={pending || (mode === "join" && !consent)}
        className="h-12 w-full bg-[#7CFF8A] text-base font-semibold text-[#06110D] hover:bg-[#A7FFAE]"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {mode === "join" ? "Join the graph" : "Save changes"}
      </Button>
    </div>
  );
}

function Required() {
  return <span className="text-[#7CFF8A]">*</span>;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-300">{children}</p>;
}
