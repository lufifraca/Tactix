"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export default function SharePage({ params }: { params: { shareId: string } }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/rewards/share/${params.shareId}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setData)
      .catch(() => setErr("This reward is private or does not exist."));
  }, [params.shareId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Reward</h1>
      {err && <div className="mt-4 text-zinc-400">{err}</div>}
      {data && (
        <div className="mt-6 rounded-lg border border-zinc-800 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.imageUrl} alt={data.title} className="w-full rounded bg-black" />
          <div className="mt-3 font-medium">{data.title}</div>
          <div className="text-sm text-zinc-400">{data.caption}</div>
          <div className="mt-4 text-xs text-zinc-600">tactix · minimalist rewards · private by default</div>
        </div>
      )}
    </main>
  );
}
