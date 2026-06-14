import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <div className="animate-float select-none text-7xl text-emerald-500/20">
        ♠
      </div>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-black text-white">
        Fant ikke siden
      </h1>
      <p className="mt-3 text-zinc-400">
        Serien eller spillet finnes ikke — kanskje lenken er feil eller spillet
        ble slettet.
      </p>
      <Link
        href="/"
        className="btn-gold mt-7 rounded-xl px-5 py-3 font-bold tracking-wide"
      >
        Til forsiden
      </Link>
    </main>
  );
}
