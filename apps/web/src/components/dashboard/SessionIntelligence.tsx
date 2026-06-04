"use client";

import type { ComponentType } from "react";
import { motion } from "framer-motion";
import type { DashboardResponse } from "@tactix/shared";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { SectionHeader } from "@/components/SectionHeader";
import { timeMeta, sessionLengthMeta } from "@/lib/uiMaps";
import { BarChart3, Sun, Calendar, Gauge, ShieldAlert, type IconProps } from "@/components/icons";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const TIMES = ["morning", "afternoon", "evening", "night"] as const;
const LENGTHS = ["short", "medium", "long"] as const;

export function SessionIntelligence({ data }: { data: DashboardResponse }) {
  const si = data.sessionInsights;
  if (!si || si.totalMatchesAnalyzed === 0) return null;

  const bestTime = si.timeOfDay.bestTime;
  const bestDay = si.dayOfWeek.bestDay;

  return (
    <section className="mt-8">
      <SectionHeader
        title="Session Intelligence"
        subtitle={`${si.totalMatchesAnalyzed} matches analyzed`}
        icon={BarChart3}
      />

      {/* Key metrics */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {bestTime && (
          <AnimatedCard delay={0.05} className="p-4">
            <Label icon={Sun}>Best Time</Label>
            <div className="mt-2 text-2xl font-bold capitalize text-emerald-400">{bestTime}</div>
            <div className="mt-1 text-sm text-zinc-400">
              {Math.round(((si.timeOfDay[bestTime]?.winRate ?? 0) as number) * 100)}% win rate
            </div>
          </AnimatedCard>
        )}
        {bestDay && (
          <AnimatedCard delay={0.1} className="p-4">
            <Label icon={Calendar}>Best Day</Label>
            <div className="mt-2 text-2xl font-bold capitalize text-steel-300">{bestDay}</div>
            <div className="mt-1 text-sm text-zinc-400">
              {Math.round(((si.dayOfWeek[bestDay]?.winRate ?? 0) as number) * 100)}% win rate
            </div>
          </AnimatedCard>
        )}
        {si.sessionLength.optimalLength && (
          <AnimatedCard delay={0.15} className="p-4">
            <Label icon={Gauge}>Optimal Session</Label>
            <div className="mt-2 text-2xl font-bold text-steel-500">
              {si.sessionLength.optimalLength === "short"
                ? "1–3"
                : si.sessionLength.optimalLength === "medium"
                  ? "4–7"
                  : "8+"}
              <span className="ml-1 text-lg">games</span>
            </div>
            <div className="mt-1 text-sm text-zinc-400">Peak performance zone</div>
          </AnimatedCard>
        )}
        {si.tilt.tiltThreshold && (
          <AnimatedCard delay={0.2} className="p-4">
            <Label icon={ShieldAlert}>Tilt Threshold</Label>
            <div className="mt-2 text-2xl font-bold text-red-400">
              {si.tilt.tiltThreshold}
              <span className="ml-1 text-lg">{si.tilt.tiltThreshold > 1 ? "losses" : "loss"}</span>
            </div>
            <div className="mt-1 text-sm text-zinc-400">Take a break after</div>
          </AnimatedCard>
        )}
      </div>

      {/* Weekly pattern */}
      <AnimatedCard delay={0.25} className="p-5">
        <Label icon={Calendar} className="mb-4">Weekly Performance Pattern</Label>
        <div className="flex h-40 items-end justify-between gap-2">
          {DAYS.map((day, i) => {
            const d = si.dayOfWeek[day] as any;
            const winRate = d?.winRate ?? 0;
            const total = d?.total ?? 0;
            const isBest = si.dayOfWeek.bestDay === day;
            const isWorst = si.dayOfWeek.worstDay === day;
            const winPct = Math.round(winRate * 100);
            const barColor =
              total === 0
                ? "bg-zinc-800/50"
                : winPct >= 55
                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                  : winPct >= 45
                    ? "bg-gradient-to-t from-amber-600 to-amber-400"
                    : "bg-gradient-to-t from-red-600 to-red-400";

            return (
              <div key={day} className="flex h-full flex-1 flex-col items-center">
                <div className="mb-1 flex min-h-[24px] items-end text-center">
                  {total > 0 && (
                    <span
                      className={`text-xs font-semibold ${
                        isBest
                          ? "text-emerald-400"
                          : isWorst
                            ? "text-red-400"
                            : winPct >= 55
                              ? "text-emerald-400/80"
                              : winPct >= 45
                                ? "text-amber-400/80"
                                : "text-red-400/80"
                      }`}
                    >
                      {winPct}%
                    </span>
                  )}
                </div>
                <div className="flex w-full flex-1 items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: total > 0 ? `${Math.max(winRate * 100, 12)}%` : "8%" }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.04 }}
                    className={`group relative w-full rounded-t-lg ${barColor} ${
                      isBest ? "ring-1 ring-emerald-400/50" : isWorst ? "ring-1 ring-red-400/50" : ""
                    }`}
                  >
                    {total > 0 && (
                      <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                        {total} games · {d?.wins ?? 0}W {total - (d?.wins ?? 0)}L
                      </div>
                    )}
                  </motion.div>
                </div>
                <div
                  className={`mt-2 text-xs ${isBest ? "font-semibold text-emerald-400" : isWorst ? "text-red-400" : "text-zinc-500"}`}
                >
                  {day.slice(0, 3).toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </AnimatedCard>

      {/* Time of day */}
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {TIMES.map((time, i) => {
          const t = si.timeOfDay[time] as any;
          const winRate = t?.winRate ?? 0;
          const total = t?.total ?? 0;
          const isBest = si.timeOfDay.bestTime === time;
          const isWorst = si.timeOfDay.worstTime === time;
          const meta = timeMeta[time];
          const Icon = meta.icon;

          return (
            <AnimatedCard
              key={time}
              delay={0.3 + i * 0.05}
              className={`p-4 ${isBest ? "ring-1 ring-emerald-500/50" : isWorst ? "ring-1 ring-red-500/30" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-300">
                  <Icon size={16} />
                </span>
                <div>
                  <div className="text-sm font-medium text-white">{meta.label}</div>
                  <div className="text-xs text-zinc-500">{meta.range}</div>
                </div>
              </div>
              {total > 0 ? (
                <>
                  <div
                    className={`mt-3 text-2xl font-bold ${isBest ? "text-emerald-400" : isWorst ? "text-red-400" : "text-white"}`}
                  >
                    {Math.round(winRate * 100)}%
                  </div>
                  <div className="text-xs text-zinc-500">{total} games played</div>
                  <div className="mt-2">
                    <AnimatedProgressBar
                      value={winRate * 100}
                      color={isBest ? "#34d399" : isWorst ? "#ef4444" : "#e4e4e7"}
                      delay={0.4 + i * 0.05}
                    />
                  </div>
                </>
              ) : (
                <div className="mt-3 text-sm text-zinc-600">No data yet</div>
              )}
            </AnimatedCard>
          );
        })}
      </div>

      {/* Session length */}
      <AnimatedCard delay={0.45} className="mt-4 p-5">
        <Label icon={Gauge} className="mb-4">Session Length Analysis</Label>
        <div className="grid gap-4 sm:grid-cols-3">
          {LENGTHS.map((length) => {
            const l = si.sessionLength[length] as any;
            const winRate = l?.winRate ?? 0;
            const total = l?.total ?? 0;
            const isOptimal = si.sessionLength.optimalLength === length;
            const meta = sessionLengthMeta[length];
            const Icon = meta.icon;

            return (
              <div
                key={length}
                className={`rounded-lg border p-4 ${
                  isOptimal
                    ? "border-steel-600/30 bg-steel-600/10"
                    : "border-zinc-700/50 bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-300">
                    <Icon size={16} />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{meta.label}</div>
                    <div className="text-xs text-zinc-500">{meta.games}</div>
                  </div>
                  {isOptimal && (
                    <span className="ml-auto rounded-full border border-steel-600/30 bg-steel-600/20 px-2 py-0.5 text-xs text-steel-400">
                      Optimal
                    </span>
                  )}
                </div>
                {total > 0 ? (
                  <div className="mt-3">
                    <div className={`text-xl font-bold ${isOptimal ? "text-steel-500" : "text-white"}`}>
                      {Math.round(winRate * 100)}% win rate
                    </div>
                    <div className="text-xs text-zinc-500">{total} matches</div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-zinc-600">No data yet</div>
                )}
              </div>
            );
          })}
        </div>
      </AnimatedCard>

      {/* Current status */}
      {si.tilt.currentLossStreak > 0 && (
        <AnimatedCard delay={0.5} className="mt-4 bg-gradient-to-r from-zinc-900 to-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label icon={ShieldAlert}>Current Status</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-lg font-bold ${si.tilt.isTilting ? "text-red-400" : "text-amber-400"}`}>
                  {si.tilt.currentLossStreak} loss streak
                </span>
                {si.tilt.isTilting && (
                  <span className="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                    Tilting
                  </span>
                )}
              </div>
            </div>
            {si.tilt.tiltThreshold && (
              <div className="text-right">
                <div className="text-xs text-zinc-500">Threshold</div>
                <div className="text-lg font-bold text-zinc-400">
                  {si.tilt.currentLossStreak} / {si.tilt.tiltThreshold}
                </div>
              </div>
            )}
          </div>
        </AnimatedCard>
      )}
    </section>
  );
}

function Label({
  icon: Icon,
  children,
  className = "",
}: {
  icon: ComponentType<IconProps>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-500 ${className}`}>
      <Icon size={13} />
      {children}
    </div>
  );
}
