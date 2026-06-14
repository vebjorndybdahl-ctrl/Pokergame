import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "../LoginForm";

export const metadata: Metadata = { title: "Logg inn · Alpha Poker" };

export default async function LoginPage() {
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
        <p className="mt-3 text-zinc-400">Logg inn for å fortsette.</p>
      </div>

      <LoginForm />

      <p className="animate-rise mt-6 text-center text-sm text-zinc-400">
        Ny her?{" "}
        <Link href="/signup" className="font-semibold text-amber-300 hover:text-amber-200">
          Opprett konto
        </Link>
      </p>
    </main>
  );
}
