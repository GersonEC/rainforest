import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-[#06110D] px-6 text-[#ECF8EF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 size-[60%] rounded-full bg-[#1FA463]/25 blur-[140px]" />
        <div className="absolute -right-1/4 bottom-0 size-[55%] rounded-full bg-[#5EEAD4]/12 blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 size-32 rounded-full bg-[#F2C94C]/10 blur-[80px]" />
      </div>

      <main className="relative z-10 flex max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-[#7CFF8A]/30 bg-[#7CFF8A]/10 text-[#7CFF8A]">
          <Share2 className="size-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Turn the room into a living graph
        </h1>
        <p className="max-w-md text-lg text-[#9BB7A3]">
          Participants scan a QR code, share what they are looking for, and appear in
          real time as glowing nodes. The network grows in front of everyone.
        </p>
        <Link
          href="/host"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[#7CFF8A] px-7 text-base font-semibold text-[#06110D] shadow-[0_0_40px_-8px_rgba(124,255,138,0.9)] transition-colors hover:bg-[#A7FFAE]"
        >
          Create your event
          <ArrowRight className="size-5" />
        </Link>
      </main>
    </div>
  );
}
