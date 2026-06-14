import { createSeries } from "./actions";
import JoinForm from "./JoinForm";

export default function Home() {
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

      {/* Hero */}
      <div className="animate-rise mb-9 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/5 px-3.5 py-1 text-xs font-medium tracking-wide text-amber-200/80">
          <span className="animate-glow">♠</span> Hjemmespillets hovedkvarter
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-6xl font-black leading-none tracking-tight">
          <span className="gold-text">Alpha</span>{" "}
          <span className="text-white">Poker</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance text-zinc-300/90">
          Start en serie for hjemmespillet ditt. Logg hver kveld, hold løpende
          stilling, og del én lenke med bordet.
        </p>
      </div>

      {/* Create form */}
      <form
        action={createSeries}
        className="glass animate-rise rounded-3xl p-7"
        style={{ animationDelay: "0.1s" }}
      >
        <label className="block text-sm font-medium text-zinc-200">
          Serienavn
          <input
            name="name"
            required
            maxLength={60}
            placeholder="Torsdagspoker"
            className="field mt-1.5 w-full px-4 py-3 text-lg"
          />
        </label>

        <label className="mt-5 block text-sm font-medium text-zinc-200">
          Valutasymbol
          <input
            name="currency"
            defaultValue="kr"
            maxLength={3}
            className="field mt-1.5 w-28 px-4 py-3 text-center"
          />
        </label>

        <button
          type="submit"
          className="btn-gold mt-7 w-full rounded-xl px-4 py-3.5 text-base font-bold tracking-wide"
        >
          Opprett serie &amp; få kode
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          eller
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Join with a code */}
      <JoinForm />

      <p className="animate-rise mx-auto mt-6 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
        Ingen registrering. Del koden (eller lenken) med gjengen — alle med den
        kan se og legge til spill.
      </p>
    </main>
  );
}
