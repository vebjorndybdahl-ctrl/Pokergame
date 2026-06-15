import type { Metadata } from "next";
import RangeCalculator from "./RangeCalculator";

export const metadata: Metadata = { title: "Range-kalkulator · Alpha Poker" };

export default function CalculatorPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-8">
      <header className="animate-rise mb-6 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight">
          <span className="gold-text">Range-kalkulator</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Hvor godt slår hånden din motstanderens range? Velg hånd, bord og
          range — så regner vi equityen.
        </p>
      </header>
      <RangeCalculator />
    </main>
  );
}
