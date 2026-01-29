"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { AnimatedCard } from "./AnimatedCard";
import { AnimatedNumber } from "./AnimatedNumber";
import { RankSparkline } from "./RankSparkline";
import { getRankHistory } from "@/lib/api";

interface TrackedGameCardProps {
  game: string;
  displayName: string | null;
  provider: string;
  rank?: {
    rankTier: string | null;
    rankDivision: string | null;
    rankNumeric: number | null;
    trend?: string | null;
    change?: number | null;
  } | null;
  delay?: number;
}

// Game logos - using placeholder emoji icons as fallback
const gameIcons: Record<string, { emoji: string; hasLogo?: boolean }> = {
  MARVEL_RIVALS: { emoji: "🦸" },
  VALORANT: { emoji: "🎯" },
  CLASH_ROYALE: { emoji: "👑" },
  BRAWL_STARS: { emoji: "⭐" },
  CS2: { emoji: "🔫" },
};

export function TrackedGameCard({ game, displayName, provider, rank, delay = 0 }: TrackedGameCardProps) {
  const [history, setHistory] = useState<{ rankNumeric: number | null; capturedAt: string }[]>([]);

  useEffect(() => {
    if (rank?.rankNumeric != null) {
      getRankHistory(game, 30)
        .then((res) => setHistory(res.history))
        .catch(() => {}); // Fail silently
    }
  }, [game, rank?.rankNumeric]);

  const colors = gameColors[game] || gameColors.CS2;
  const icon = gameIcons[game] || { emoji: "🎮" };

  return (
    <AnimatedCard
      delay={delay}
      glowColor={colors.glow}
      className={`p-4 bg-gradient-to-br ${colors.gradient}`}
    >
      <div className="flex items-start gap-3">
        {/* Game Icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          {icon.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Game Name */}
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.primary }}>
            {gameLabels[game] || game}
          </div>

          {/* Account Name */}
          {displayName && (
            <div className="text-sm text-zinc-400 truncate" title={displayName}>
              {displayName}
            </div>
          )}

          {/* Rank Info */}
          {rank ? (
            <>
              {rank.rankTier && (
                <div className="mt-1 text-lg font-semibold text-white">
                  {rank.rankTier}
                  {rank.rankDivision && ` ${rank.rankDivision}`}
                </div>
              )}
              {rank.rankNumeric != null && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-2xl font-bold text-white">
                    <AnimatedNumber value={rank.rankNumeric} />
                  </div>
                  {rank.trend && rank.change != null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-sm font-semibold ${
                        rank.trend === "up" ? "text-green-400" :
                        rank.trend === "down" ? "text-red-400" :
                        "text-zinc-500"
                      }`}
                    >
                      {rank.trend === "up" && `+${rank.change}`}
                      {rank.trend === "down" && `${rank.change}`}
                      {rank.trend === "stable" && "—"}
                    </motion.div>
                  )}
                </div>
              )}
              {/* Sparkline */}
              {history.length >= 2 && (
                <div className="mt-2">
                  <RankSparkline history={history} />
                </div>
              )}
            </>
          ) : (
            <div className="mt-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Linked · Waiting for data
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Provider badge */}
      <div className="mt-3 pt-2 border-t border-zinc-700/30">
        <div className="text-xs text-zinc-600">
          via {
            provider === "SUPERCELL_API" ? "Supercell API" :
            provider === "TRACKER_NETWORK" ? "Tracker Network" :
            provider === "COMMUNITY" ? "Community API" :
            provider === "HENRIK_API" ? "Henrik API" :
            provider === "STEAM" ? "Steam" :
            provider
          }
        </div>
      </div>
    </AnimatedCard>
  );
}
