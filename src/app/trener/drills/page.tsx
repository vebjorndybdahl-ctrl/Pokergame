import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import DrillRunner from "./DrillRunner";

export const metadata: Metadata = { title: "Drills · Alpha Poker" };

export default async function DrillsPage() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
      <header className="animate-rise mb-6 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight">
          <span className="gold-text">Scenario-drills</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Faste spot — velg trekket, få fasit med en gang.
        </p>
      </header>
      <DrillRunner isLoggedIn={!!user} />
    </main>
  );
}
