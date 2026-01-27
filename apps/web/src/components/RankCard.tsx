"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { AnimatedCard } from "./AnimatedCard";
import { AnimatedNumber } from "./AnimatedNumber";
import { RankSparkline } from "./RankSparkline";
import { getRankHistory } from "@/lib/api";

interface RankData {
  game: string;
  rankTier: string | null;
  rankDivision: string | null;
  rankNumeric: number | null;
  trend?: string | null;
  change?: number | null;
}

export function RankCard({ rank, delay = 0 }: { rank: RankData; delay?: number }) {
  const [history, setHistory] = useState<{ rankNumeric: number | null; capturedAt: string }[]>([]);

  useEffect(() => {
    getRankHistory(rank.game, 30)
      .then((res) => setHistory(res.history))
      .catch(() => {}); // Fail silently
  }, [rank.game]);

  const colors = gameColors[rank.game] || gameColors.CS2;

  return (
    <AnimatedCard
      delay={delay}
      glowColor={colors.glow}
      className={`p-4 bg-gradient-to-br ${colors.gradient}`}
    >
      <div className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.primary }}>
        {gameLabels[rank.game] || rank.game}
      </div>
      {rank.rankTier && (
        <div className="mt-2 text-lg font-semibold text-white">
          {rank.rankTier}
          {rank.rankDivision && ` ${rank.rankDivision}`}
        </div>
      )}
      {rank.rankNumeric != null && (
        <div className="mt-1 flex items-center gap-2">
          <div className="text-3xl font-bold text-white">
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
        <div className="mt-3">
          <RankSparkline history={history} />
        </div>
      )}
    </AnimatedCard>
  );
}
