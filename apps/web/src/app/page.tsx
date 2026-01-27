"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">tactix</h1>
      <p className="mt-3 text-zinc-300">
        A daily coach-style dashboard that turns your match stats into focused quests — across CS2 and Marvel Rivals.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/login" className="rounded-md bg-white px-4 py-2 text-zinc-950 font-medium">
          Sign in
        </Link>
        <Link href="/dashboard" className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-100">
          Go to dashboard
        </Link>
      </div>

      <div className="mt-10 border-t border-zinc-800 pt-6 text-sm text-zinc-400">
        v1: Solo-only quests · Verifiable stats · Private-by-default rewards
      </div>
    </main>
  );
}
