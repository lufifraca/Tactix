"use client";

export function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-64 bg-zinc-800 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-zinc-800/50 rounded-xl" />
      </div>
    </div>
  );
}
