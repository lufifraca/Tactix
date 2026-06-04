"use client";

import type { DashboardResponse } from "@tactix/shared";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { SectionHeader } from "@/components/SectionHeader";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { Flame, Trophy, Skull, Star, Award } from "@/components/icons";

export function StreaksMilestones({ data }: { data: DashboardResponse }) {
  const sm = data.streaksAndMilestones;
  if (!sm) return null;

  const gameStreaks = sm.gameStreaks.filter((gs) => gs.currentStreak >= 2 && gs.game !== "CS2");
  const milestones = sm.milestones.filter((m) => m.type !== "win_streak" && m.game !== "CS2");
  const isEmpty =
    sm.questStreak.current === 0 && gameStreaks.length === 0 && milestones.length === 0;

  return (
    <section className="mt-8">
      <SectionHeader title="Streaks & Milestones" icon={Award} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sm.questStreak.current > 0 && (
          <AnimatedCard delay={0.05} className="p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400">
                <Flame size={20} />
              </span>
              <div>
                <div className="text-2xl font-bold text-amber-400">
                  <AnimatedNumber value={sm.questStreak.current} duration={0.5} />
                </div>
                <div className="text-xs text-zinc-500">Quest Streak</div>
              </div>
            </div>
            {sm.questStreak.best > sm.questStreak.current && (
              <div className="mt-2 text-xs text-zinc-600">Best: {sm.questStreak.best}</div>
            )}
          </AnimatedCard>
        )}

        {gameStreaks.map((gs, i) => {
          const colors = gameColors[gs.game] || gameColors.MARVEL_RIVALS;
          const isWin = gs.streakType === "WIN";
          return (
            <AnimatedCard
              key={gs.game}
              delay={0.1 + i * 0.05}
              className={`bg-gradient-to-br p-4 ${colors.gradient}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isWin ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isWin ? <Trophy size={20} /> : <Skull size={20} />}
                </span>
                <div>
                  <div className={`text-2xl font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                    {gs.currentStreak}
                  </div>
                  <div className="text-xs text-zinc-500">{isWin ? "Win" : "Loss"} Streak</div>
                </div>
              </div>
              <div className="mt-2 text-xs font-medium" style={{ color: colors.primary }}>
                {gameLabels[gs.game] || gs.game}
              </div>
            </AnimatedCard>
          );
        })}

        {milestones.map((m, i) => {
          const colors = m.game ? gameColors[m.game] || gameColors.MARVEL_RIVALS : null;
          return (
            <AnimatedCard
              key={`${m.type}-${m.game || "all"}`}
              delay={0.15 + i * 0.05}
              className={`p-4 ${colors ? `bg-gradient-to-br ${colors.gradient}` : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-steel-600/20 to-steel-400/20 text-steel-400">
                  <Star size={20} />
                </span>
                <div>
                  <div className="text-lg font-bold text-white">{m.label}</div>
                  <div className="text-xs text-zinc-500">
                    {m.game ? gameLabels[m.game] || m.game : "All Games"}
                  </div>
                </div>
              </div>
            </AnimatedCard>
          );
        })}

        {isEmpty && (
          <AnimatedCard delay={0.05} className="p-6 text-center sm:col-span-2 lg:col-span-4">
            <div className="text-zinc-500">Play some matches to start building streaks!</div>
          </AnimatedCard>
        )}
      </div>
    </section>
  );
}
