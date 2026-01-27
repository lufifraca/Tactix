"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { getCharacterBreakdown, type CharacterStatClient } from "@/lib/api";
import { SectionHeader } from "./SectionHeader";
import { AnimatedCard } from "./AnimatedCard";

type GameFilter = "ALL" | "MARVEL_RIVALS" | "VALORANT";

export function CharacterBreakdown() {
  const [filter, setFilter] = useState<GameFilter>("ALL");
  const [characters, setCharacters] = useState<CharacterStatClient[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCharacterBreakdown(filter === "ALL" ? undefined : filter)
      .then((res) => {
        setCharacters(res.characters);
        setTotalGames(res.totalGames);
      })
      .catch(() => {
        setCharacters([]);
        setTotalGames(0);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  if (!loading && characters.length === 0 && filter === "ALL") {
    return null; // Don't show section if no character data at all
  }

  const tabs: { key: GameFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "MARVEL_RIVALS", label: "Marvel Rivals" },
    { key: "VALORANT", label: "Valorant" },
  ];

  return (
    <section className="mt-8">
      <SectionHeader title="Hero / Agent Breakdown" subtitle={totalGames > 0 ? `${totalGames} matches` : undefined} />

      {/* Game filter tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-zinc-900/50 border border-zinc-800/50 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === tab.key
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <AnimatedCard className="p-6 text-center">
          <div className="text-zinc-500">No character data for this filter.</div>
        </AnimatedCard>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {characters.slice(0, 12).map((char, i) => {
              const colors = gameColors[char.game] || gameColors.CS2;
              return (
                <motion.div
                  key={`${char.game}-${char.character}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 hover:bg-zinc-900/80 transition-colors`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                      >
                        {char.character.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">{char.character}</div>
                        <div className="text-[11px] text-zinc-500">
                          {char.gamesPlayed} {char.gamesPlayed === 1 ? "game" : "games"}
                          {filter === "ALL" && (
                            <span style={{ color: colors.primary }}> · {gameLabels[char.game]?.split(" ")[0] || char.game}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${char.winRate >= 55 ? "text-green-400" : char.winRate >= 45 ? "text-zinc-300" : "text-red-400"}`}>
                      {char.winRate}%
                    </div>
                  </div>

                  {/* Win rate bar */}
                  <div className="h-1.5 w-full rounded-full bg-zinc-800/50 overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${char.winRate}%` }}
                      transition={{ duration: 0.6, delay: i * 0.03, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: char.winRate >= 55 ? "#22c55e" : char.winRate >= 45 ? "#71717a" : "#ef4444",
                      }}
                    />
                  </div>

                  {/* K/D/A */}
                  {char.avgKills != null && (
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-zinc-500">
                        <span className="text-green-400 font-medium">{char.avgKills}</span> K
                      </span>
                      <span className="text-zinc-500">
                        <span className="text-red-400 font-medium">{char.avgDeaths}</span> D
                      </span>
                      <span className="text-zinc-500">
                        <span className="text-blue-400 font-medium">{char.avgAssists}</span> A
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
