import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
      {/* Floating suit accents */}
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -left-2 top-10 select-none text-7xl text-emerald-500/15"
      >
        ♣
      </div>
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute right-0 top-24 select-none text-6xl text-amber-300/15"
        style={{ animationDelay: "1.5s" }}
      >
        ♦
      </div>

      <div className="animate-rise text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/5 px-3.5 py-1 text-xs font-medium tracking-wide text-amber-200/80">
          <span className="animate-glow">♠</span> Hjemmespillets hovedkvarter
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-6xl font-black leading-none tracking-tight">
          <span className="gold-text">Alpha</span>{" "}
          <span className="text-white">Poker</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-zinc-300/90">
          Følg hjemmespillet ditt: lag en serie, inviter vennene, logg hver
          kveld og hold løpende stilling. Klikk inn på hvert spill for å se hvem
          som gikk i pluss.
        </p>
      </div>

      <div className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center" style={{ animationDelay: "0.1s" }}>
        <Link
          href="/signup"
          className="btn-gold rounded-xl px-6 py-3.5 text-center text-base font-bold tracking-wide"
        >
          Opprett konto
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-center text-base font-semibold text-zinc-200 transition hover:border-white/30 hover:text-white"
        >
          Logg inn
        </Link>
      </div>

      <Link
        href="/laer"
        className="glass card-rise animate-rise mt-8 flex items-center justify-between gap-4 rounded-2xl px-6 py-5 hover:border-amber-300/30"
        style={{ animationDelay: "0.2s" }}
      >
        <div>
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="gold-text">♦</span> Ny til poker?
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">
            Interaktiv guide fra reglene til ekte pokerteori.
          </p>
        </div>
        <span className="shrink-0 text-amber-200/80">Lær poker →</span>
      </Link>
    </main>
  );
}
