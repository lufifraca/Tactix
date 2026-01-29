"use client";

import { motion } from "framer-motion";
import { gameColors, gameLabels } from "@/lib/gameTheme";

export function GamePieChart({ counts }: { counts: Record<string, number> | undefined }) {
  if (!counts) return null;
  // skip cs2
  const entries = Object.entries(counts).filter(([game]) => game !== "CS2").sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 32 32" className="absolute top-0 left-0 h-full w-full -rotate-90 transform">
          {(() => {
            let acc = 0;
            return entries.map(([game, count], i) => {
              const pct = (count / total) * 100;
              const color = gameColors[game]?.primary || "#666";
              const el = (
                <motion.circle
                  key={game}
                  cx="16"
                  cy="16"
                  r="12"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${pct} 100` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  style={{ strokeDashoffset: -acc, filter: `drop-shadow(0 0 4px ${color}60)` }}
                />
              );
              acc += pct;
              return el;
            });
          })()}
        </svg>
      </div>
      <div className="text-[11px] space-y-1">
        {entries.map(([game, count]) => (
          <div key={game} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: gameColors[game]?.primary || "#666",
                boxShadow: `0 0 6px ${gameColors[game]?.primary || "#666"}60`,
              }}
            />
            <span className="text-zinc-400">{gameLabels[game] || game}</span>
            <span className="text-zinc-600">({count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
