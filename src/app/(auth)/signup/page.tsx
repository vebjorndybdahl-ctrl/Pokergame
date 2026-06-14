import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import SignupForm from "../SignupForm";

export const metadata: Metadata = { title: "Opprett konto · Alpha Poker" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <div className="animate-rise mb-7 text-center">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-4xl font-black tracking-tight"
        >
          <span className="gold-text">♠ Alpha</span>{" "}
          <span className="text-white">Poker</span>
        </Link>
        <p className="mt-3 text-zinc-400">Lag en konto for å spille med gjengen.</p>
      </div>

      <SignupForm />

      <p className="animate-rise mt-6 text-center text-sm text-zinc-400">
        Har du konto?{" "}
        <Link href="/login" className="font-semibold text-amber-300 hover:text-amber-200">
          Logg inn
        </Link>
      </p>
    </main>
  );
}
