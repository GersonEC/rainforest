import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-[#05070d] px-6 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 size-[60%] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute -right-1/4 bottom-0 size-[55%] rounded-full bg-fuchsia-500/15 blur-[140px]" />
      </div>

      <main className="relative z-10 flex max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          <Share2 className="size-7" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Trasforma la sala in un grafo vivo
        </h1>
        <p className="max-w-md text-lg text-white/60">
          I partecipanti scansionano un QR, dicono cosa cercano e appaiono in tempo reale
          come nodi luminosi. La rete cresce sotto gli occhi di tutti.
        </p>
        <Link
          href="/host"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-cyan-400 px-7 text-base font-semibold text-black shadow-[0_0_40px_-8px_rgba(0,229,255,0.9)] transition-colors hover:bg-cyan-300"
        >
          Crea il tuo evento
          <ArrowRight className="size-5" />
        </Link>
      </main>
    </div>
  );
}
