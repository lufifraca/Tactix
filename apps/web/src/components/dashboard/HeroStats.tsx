"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";
import type { DashboardResponse } from "@tactix/shared";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { gameIcon } from "@/lib/uiMaps";
import {
  Activity,
  Clock,
  Crosshair,
  Flame,
  Gamepad2,
  Skull,
  TrendingDown,
  TrendingUp,
  Trophy,
  type IconProps,
} from "@/components/icons";

type Tile = {
  key: string;
  icon: ComponentType<IconProps>;
  label: string;
  value: React.ReactNode;
  accent?: string;
};

function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
  return `${Math.floor(seconds / 60)}m`;
}

export function HeroStats({ data }: { data: DashboardResponse }) {
  const tp = data.todayPerformance;
  const matches = tp?.matchesPlayed ?? 0;
  const winRate = tp?.winRate ?? null;
  const winPct = winRate !== null ? Math.round(winRate * 100) : null;
  const hasMatchesToday = matches > 0;

  const winColor =
    winPct === null ? "#a1a1aa" : winPct >= 50 ? "#34d399" : "#f87171";

  // Headline rank: first linked account (excluding retired CS2) that has a rank.
  const headlineRank = (() => {
    const accounts = (data.linkedAccounts ?? []).filter((a) => a.game !== "CS2");
    for (const a of accounts) {
      const r = data.ranks?.[a.game];
      if (r && (r.rankTier || r.rankNumeric != null)) return { game: a.game, rank: r };
    }
    return null;
  })();

  // Best current streak across games.
  const bestStreak = (() => {
    const streaks = (data.streaksAndMilestones?.gameStreaks ?? []).filter(
      (s) => s.game !== "CS2" && s.currentStreak >= 2 && s.streakType
    );
    return streaks.sort((a, b) => b.currentStreak - a.currentStreak)[0] ?? null;
  })();

  const hasKda = (tp?.totalKills ?? 0) > 0 || (tp?.totalDeaths ?? 0) > 0;

  // Candidate tiles in priority order; we render the first four.
  const candidates: Tile[] = [];

  if (headlineRank) {
    const r = headlineRank.rank;
    const trendIcon =
      r.trend === "up" ? TrendingUp : r.trend === "down" ? TrendingDown : null;
    candidates.push({
      key: "rank",
      icon: gameIcon(headlineRank.game),
      label: `${gameLabels[headlineRank.game] ?? headlineRank.game} Rank`,
      accent: gameColors[headlineRank.game]?.primary,
      value: (
        <span className="flex items-baseline gap-2">
          <span className="truncate">
            {r.rankTier ?? r.rankNumeric}
            {r.rankDivision ? ` ${r.rankDivision}` : ""}
          </span>
          {trendIcon && r.change != null && (
            <span
              className={`inline-flex items-center text-sm font-semibold ${
                r.trend === "up" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {(() => {
                const T = trendIcon;
                return <T size={14} />;
              })()}
            </span>
          )}
        </span>
      ),
    });
  }

  if (bestStreak) {
    const isWin = bestStreak.streakType === "WIN";
    candidates.push({
      key: "streak",
      icon: isWin ? Flame : Skull,
      label: `${isWin ? "Win" : "Loss"} Streak · ${gameLabels[bestStreak.game] ?? bestStreak.game}`,
      accent: isWin ? "#fbbf24" : "#f87171",
      value: (
        <span className={isWin ? "text-amber-400" : "text-red-400"}>
          {bestStreak.currentStreak}
        </span>
      ),
    });
  }

  if (hasKda) {
    candidates.push({
      key: "kda",
      icon: Crosshair,
      label: "K / D / A",
      value: (
        <span className="tabular-nums">
          <span className="text-steel-300">{tp!.totalKills}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-red-400">{tp!.totalDeaths}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-steel-300">{tp!.totalAssists}</span>
        </span>
      ),
    });
  }

  candidates.push({
    key: "time",
    icon: Clock,
    label: "Time Played",
    value: formatTime(tp?.timePlayedSeconds ?? 0),
  });

  candidates.push({
    key: "matches",
    icon: Gamepad2,
    label: "Matches Today",
    value: <AnimatedNumber value={matches} duration={0.5} />,
  });

  candidates.push({
    key: "record",
    icon: Trophy,
    label: "W / L" + ((tp?.draws ?? 0) > 0 ? " / D" : ""),
    value: (
      <span className="tabular-nums">
        <span className="text-emerald-400">{tp?.wins ?? 0}</span>
        <span className="text-zinc-600">/</span>
        <span className="text-red-400">{tp?.losses ?? 0}</span>
        {(tp?.draws ?? 0) > 0 && (
          <>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{tp!.draws}</span>
          </>
        )}
      </span>
    ),
  });

  const tiles = candidates.slice(0, 4);
  const byGame = Object.entries(tp?.byGame ?? {});

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:auto-rows-fr">
      {/* Win-rate hero tile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6"
      >
        {/* ambient accent */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: winColor }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
            <Activity size={14} className="text-steel-300" />
            Today&apos;s Win Rate
          </div>

          <div className="mt-4 flex items-end gap-3">
            <span
              className="text-7xl font-bold leading-none tracking-tight tabular-nums sm:text-8xl"
              style={{ color: winColor }}
            >
              {winPct !== null ? winPct : "—"}
              {winPct !== null && <span className="text-4xl align-top">%</span>}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {hasMatchesToday ? (
              <>
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  {tp!.wins}W
                </span>
                <span className="rounded-md bg-red-500/10 px-2 py-1 font-semibold text-red-400 ring-1 ring-inset ring-red-500/20">
                  {tp!.losses}L
                </span>
                {tp!.draws > 0 && (
                  <span className="rounded-md bg-zinc-500/10 px-2 py-1 font-semibold text-zinc-400 ring-1 ring-inset ring-zinc-500/20">
                    {tp!.draws}D
                  </span>
                )}
                <span className="text-zinc-500">· {matches} match{matches === 1 ? "" : "es"}</span>
              </>
            ) : (
              <span className="text-zinc-500">No matches logged today — go play a few.</span>
            )}
          </div>

          {byGame.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-800/70 pt-4">
              {byGame.map(([game, gd]) => (
                <span key={game} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: gameColors[game]?.primary ?? "#666" }}
                  />
                  {gameLabels[game] ?? game}: {(gd as any).matchesPlayed} ({(gd as any).wins}W)
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Supporting stat tiles */}
      {tiles.map((t, i) => {
        const Icon = t.icon;
        return (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.05, ease: "easeOut" }}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-zinc-500">
              <Icon size={15} style={t.accent ? { color: t.accent } : undefined} />
              <span className="truncate text-[11px] font-medium uppercase tracking-wider">
                {t.label}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{t.value}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
