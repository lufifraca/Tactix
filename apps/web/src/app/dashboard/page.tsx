"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPatch, apiPost, getDashboard, steamLinkUrl } from "@/lib/api";
import type { DashboardResponse } from "@tactix/shared";
import { gameColors, gameLabels, domainLabels } from "@/lib/gameTheme";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { RankCard } from "@/components/RankCard";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { GamePieChart } from "@/components/GamePieChart";
import { SectionHeader } from "@/components/SectionHeader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useSidebar } from "@/components/SidebarContext";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { CharacterBreakdown } from "@/components/CharacterBreakdown";

export default function DashboardPage() {
  const [mode, setMode] = useState<"ALL" | "RANKED" | "UNRANKED">("ALL");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAuthError, setIsAuthError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<{ type: "success" | "warn" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    setIsAuthError(false);
    try {
      const d = await getDashboard(mode);
      setData(d);
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      const is401 = msg.includes("401") || msg.includes("Unauthorized");
      setIsAuthError(is401);
      setErr(is401 ? "You need to sign in." : `Dashboard failed to load: ${msg}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Auto-detect and set timezone if not already configured (for accurate time-of-day analytics)
  useEffect(() => {
    async function syncTimezone() {
      try {
        const me = await apiGet<{ timezone?: string | null }>("/me");
        if (!me?.timezone) {
          const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (detectedTz) {
            await apiPatch("/me/timezone", { timezone: detectedTz });
            console.log("[Tactix] Auto-detected timezone:", detectedTz);
          }
        }
      } catch {
        // Non-fatal: timezone sync failure shouldn't block the dashboard
      }
    }
    syncTimezone();
  }, []);

  async function refresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await apiPost<{ ok: boolean; result: { ok: boolean; results: Array<{ ok: boolean; game?: string; inserted?: number; error?: string }> } }>("/ingest/refresh");
      const results = res?.result?.results ?? [];
      const failed = results.filter(r => !r.ok);
      const succeeded = results.filter(r => r.ok);

      if (failed.length > 0 && succeeded.length === 0) {
        setRefreshMsg({ type: "error", text: failed.map(f => `${f.game}: ${f.error || "unknown error"}`).join(" · ") });
      } else if (failed.length > 0) {
        const inserted = succeeded.reduce((s, r) => s + (r.inserted ?? 0), 0);
        setRefreshMsg({ type: "warn", text: `${inserted} new matches. Failed: ${failed.map(f => `${f.game}: ${f.error || "unknown error"}`).join(", ")}` });
      } else if (succeeded.length > 0) {
        const inserted = succeeded.reduce((s, r) => s + (r.inserted ?? 0), 0);
        setRefreshMsg({ type: "success", text: inserted > 0 ? `Synced ${inserted} new match${inserted === 1 ? "" : "es"}` : "All games up to date" });
      }
      await load();
    } catch (e: any) {
      setRefreshMsg({ type: "error", text: e?.message ?? "Refresh failed" });
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const { setOpen: setSidebarOpen } = useSidebar();

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            {isAuthError ? "Welcome to Tactix" : "Something went wrong"}
          </h1>
          <p className="mt-4 text-zinc-400 max-w-lg mx-auto break-words">{err ?? "Loading your dashboard..."}</p>
          {isAuthError ? (
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-medium text-white hover:opacity-90 transition-opacity"
            >
              Sign in to continue
            </Link>
          ) : (
            <button
              onClick={() => load()}
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-medium text-white hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (data.onboardingState === "NEEDS_GAME_LINK") {
    return <OnboardingWizard onComplete={load} />;
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Tactix"
                width={48}
                height={48}
                className="rounded-xl shadow-lg shadow-purple-500/20"
              />
              <div>
                <Image
                  src="/fonts/tactix_title.png"
                  alt="Tactix"
                  width={120}
                  height={30}
                  className="h-7 w-auto"
                />
                <p className="text-xs text-zinc-500 mt-0.5">Dashboard</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                data.subscriptionActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {data.subscriptionActive ? "Pro" : "Free"}
              </span>
              <span>·</span>
              <span>Last sync: {data.lastIngestAt ? new Date(data.lastIngestAt).toLocaleTimeString() : "—"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={refresh}
              disabled={refreshing}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-shadow disabled:opacity-50"
            >
              {refreshing ? "Syncing..." : "Refresh stats"}
            </motion.button>
            {/* Admin-only: Toggle Pro (only for owner account) */}
            {data.me.email === "lficanolatimer@gmail.com" && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  const res = await apiPost<any>("/dashboard/debug/toggle-pro");
                  alert(`Pro is now ${res.subscriptionActive ? "ON" : "OFF"}`);
                  await load();
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  data.subscriptionActive
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {data.subscriptionActive ? 'Pro ON' : 'Enable Pro'}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>
          </div>
        </motion.header>

        {/* Refresh result message */}
        <AnimatePresence>
          {refreshMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-3 rounded-lg px-4 py-2.5 text-sm border ${
                refreshMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : refreshMsg.type === "warn"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="break-all">{refreshMsg.text}</span>
                <button onClick={() => setRefreshMsg(null)} className="shrink-0 opacity-60 hover:opacity-100">&times;</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode selector */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 flex gap-2"
        >
          {(["ALL", "RANKED", "UNRANKED"] as const).map((m) => (
            <motion.button
              key={m}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? "bg-white text-zinc-900 shadow-lg shadow-white/20"
                  : "border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {m === "ALL" ? "All Modes" : m === "RANKED" ? "Ranked" : "Unranked"}
            </motion.button>
          ))}
        </motion.section>

        {/* Today's Performance Summary */}
        {data.todayPerformance && data.todayPerformance.matchesPlayed > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 24 }}
                    transition={{ duration: 0.4 }}
                    className="h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                  />
                  <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-300">Today&apos;s Performance</h2>
                </div>
                <span className="text-xs text-zinc-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-5">
                {/* Matches */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    <AnimatedNumber value={data.todayPerformance.matchesPlayed} duration={0.5} />
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Matches</div>
                </div>

                {/* Win Rate */}
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    data.todayPerformance.winRate !== null && data.todayPerformance.winRate >= 0.5 ? 'text-green-400' :
                    data.todayPerformance.winRate !== null ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {data.todayPerformance.winRate !== null ? `${Math.round(data.todayPerformance.winRate * 100)}%` : '—'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Win Rate</div>
                </div>

                {/* W/L/D */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    <span className="text-green-400">{data.todayPerformance.wins}</span>
                    <span className="text-zinc-600 mx-1">/</span>
                    <span className="text-red-400">{data.todayPerformance.losses}</span>
                    {data.todayPerformance.draws > 0 && (
                      <>
                        <span className="text-zinc-600 mx-1">/</span>
                        <span className="text-zinc-400">{data.todayPerformance.draws}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">W / L{data.todayPerformance.draws > 0 ? ' / D' : ''}</div>
                </div>

                {/* KDA */}
                {(data.todayPerformance.totalKills > 0 || data.todayPerformance.totalDeaths > 0) && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      <span className="text-cyan-400">{data.todayPerformance.totalKills}</span>
                      <span className="text-zinc-600 mx-0.5">/</span>
                      <span className="text-red-400">{data.todayPerformance.totalDeaths}</span>
                      <span className="text-zinc-600 mx-0.5">/</span>
                      <span className="text-blue-400">{data.todayPerformance.totalAssists}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">K / D / A</div>
                  </div>
                )}

                {/* Time Played */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    {data.todayPerformance.timePlayedSeconds >= 3600
                      ? `${Math.floor(data.todayPerformance.timePlayedSeconds / 3600)}h ${Math.floor((data.todayPerformance.timePlayedSeconds % 3600) / 60)}m`
                      : `${Math.floor(data.todayPerformance.timePlayedSeconds / 60)}m`
                    }
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Time Played</div>
                </div>
              </div>

              {/* Per-game breakdown dots */}
              {Object.keys(data.todayPerformance.byGame).length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-zinc-800/50">
                  {Object.entries(data.todayPerformance.byGame).map(([game, gd]) => (
                    <div key={game} className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: gameColors[game]?.primary || "#666",
                          boxShadow: `0 0 6px ${gameColors[game]?.primary || "#666"}60`,
                        }}
                      />
                      <span className="text-xs text-zinc-400">
                        {gameLabels[game] || game}: {(gd as any).matchesPlayed} ({(gd as any).wins}W)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Tilt Alert */}
        <AnimatePresence>
          {data.tiltAlert?.shouldTakeBreak && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6"
            >
              <div className={`rounded-xl p-4 backdrop-blur-sm ${
                data.tiltAlert.severity === 'high'
                  ? 'bg-gradient-to-r from-red-950/50 to-red-900/30 border border-red-500/30'
                  : data.tiltAlert.severity === 'medium'
                  ? 'bg-gradient-to-r from-orange-950/50 to-amber-900/30 border border-orange-500/30'
                  : 'bg-gradient-to-r from-yellow-950/50 to-amber-900/30 border border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-3xl"
                  >
                    {data.tiltAlert.severity === 'high' ? '🛑' : data.tiltAlert.severity === 'medium' ? '⚠️' : '💡'}
                  </motion.div>
                  <div>
                    <div className="font-semibold text-white">
                      {data.tiltAlert.severity === 'high' ? 'Time for a Break' : data.tiltAlert.severity === 'medium' ? 'Consider Taking a Break' : 'Quick Heads Up'}
                    </div>
                    <div className="mt-1 text-sm text-zinc-300">{data.tiltAlert.reason}</div>
                    {data.tiltAlert.suggestedBreakMinutes && (
                      <div className="mt-2 text-xs text-zinc-400">
                        Suggested break: {data.tiltAlert.suggestedBreakMinutes} minutes
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Session Intelligence */}
        {data.sessionInsights && data.sessionInsights.totalMatchesAnalyzed > 0 && (
          <section className="mt-8">
            <SectionHeader title="Session Intelligence" subtitle={`${data.sessionInsights.totalMatchesAnalyzed} matches analyzed`} />

            {/* Key Metrics Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              {data.sessionInsights.timeOfDay.bestTime && (
                <AnimatedCard delay={0.1} className="p-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Best Time</div>
                  <div className="mt-2 text-2xl font-bold text-green-400 capitalize">
                    {data.sessionInsights.timeOfDay.bestTime}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {((data.sessionInsights.timeOfDay[data.sessionInsights.timeOfDay.bestTime as keyof typeof data.sessionInsights.timeOfDay] as any)?.winRate * 100).toFixed(0)}% win rate
                  </div>
                </AnimatedCard>
              )}
              {data.sessionInsights.dayOfWeek.bestDay && (
                <AnimatedCard delay={0.15} className="p-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Best Day</div>
                  <div className="mt-2 text-2xl font-bold text-blue-400 capitalize">
                    {data.sessionInsights.dayOfWeek.bestDay}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {((data.sessionInsights.dayOfWeek[data.sessionInsights.dayOfWeek.bestDay as keyof typeof data.sessionInsights.dayOfWeek] as any)?.winRate * 100).toFixed(0)}% win rate
                  </div>
                </AnimatedCard>
              )}
              {data.sessionInsights.sessionLength.optimalLength && (
                <AnimatedCard delay={0.2} className="p-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Optimal Session</div>
                  <div className="mt-2 text-2xl font-bold text-purple-400">
                    {data.sessionInsights.sessionLength.optimalLength === 'short' ? '1-3' :
                     data.sessionInsights.sessionLength.optimalLength === 'medium' ? '4-7' : '8+'}
                    <span className="text-lg ml-1">games</span>
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">Peak performance zone</div>
                </AnimatedCard>
              )}
              {data.sessionInsights.tilt.tiltThreshold && (
                <AnimatedCard delay={0.25} className="p-4">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Tilt Threshold</div>
                  <div className="mt-2 text-2xl font-bold text-red-400">
                    {data.sessionInsights.tilt.tiltThreshold}
                    <span className="text-lg ml-1">{data.sessionInsights.tilt.tiltThreshold > 1 ? 'losses' : 'loss'}</span>
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">Take a break after</div>
                </AnimatedCard>
              )}
            </div>

            {/* Day of Week Performance Chart */}
            <AnimatedCard delay={0.3} className="p-5">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Weekly Performance Pattern</div>
              <div className="flex items-end justify-between gap-2 h-40">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day, i) => {
                  const dayData = data.sessionInsights?.dayOfWeek?.[day] as any;
                  const winRate = dayData?.winRate ?? 0;
                  const total = dayData?.total ?? 0;
                  const isBest = data.sessionInsights?.dayOfWeek?.bestDay === day;
                  const isWorst = data.sessionInsights?.dayOfWeek?.worstDay === day;
                  const winPct = Math.round(winRate * 100);

                  // Color the bar based on win rate: green (>55%), yellow (45-55%), red (<45%)
                  const barColor = total === 0 ? 'bg-zinc-800/50' :
                    winPct >= 55 ? 'bg-gradient-to-t from-green-600 to-green-400' :
                    winPct >= 45 ? 'bg-gradient-to-t from-amber-600 to-amber-400' :
                    'bg-gradient-to-t from-red-600 to-red-400';

                  return (
                    <div key={day} className="flex-1 flex flex-col items-center h-full">
                      {/* Win rate label always visible */}
                      <div className="mb-1 text-center min-h-[24px] flex items-end">
                        {total > 0 && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 + i * 0.05 }}
                            className={`text-xs font-semibold ${
                              isBest ? 'text-green-400' :
                              isWorst ? 'text-red-400' :
                              winPct >= 55 ? 'text-green-400/80' :
                              winPct >= 45 ? 'text-amber-400/80' :
                              'text-red-400/80'
                            }`}
                          >
                            {winPct}%
                          </motion.span>
                        )}
                      </div>

                      {/* Bar container */}
                      <div className="flex-1 w-full flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: total > 0 ? `${Math.max(winRate * 100, 12)}%` : '8%' }}
                          transition={{ duration: 0.6, delay: 0.4 + i * 0.05 }}
                          className={`w-full rounded-t-lg relative group cursor-pointer transition-all ${barColor} ${
                            isBest ? 'ring-1 ring-green-400/50' : isWorst ? 'ring-1 ring-red-400/50' : ''
                          }`}
                        >
                          {total > 0 && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 px-2 py-1 rounded text-xs whitespace-nowrap z-10 border border-zinc-700">
                              {total} games · {dayData?.wins ?? 0}W {(total - (dayData?.wins ?? 0))}L
                            </div>
                          )}
                        </motion.div>
                      </div>

                      {/* Day label */}
                      <div className={`mt-2 text-xs ${isBest ? 'text-green-400 font-semibold' : isWorst ? 'text-red-400' : 'text-zinc-500'}`}>
                        {day.slice(0, 3).toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnimatedCard>

            {/* Time of Day Performance */}
            <div className="grid gap-3 sm:grid-cols-4 mt-4">
              {(['morning', 'afternoon', 'evening', 'night'] as const).map((time, i) => {
                const timeData = data.sessionInsights?.timeOfDay?.[time] as any;
                const winRate = timeData?.winRate ?? 0;
                const total = timeData?.total ?? 0;
                const isBest = data.sessionInsights?.timeOfDay?.bestTime === time;
                const isWorst = data.sessionInsights?.timeOfDay?.worstTime === time;
                const timeLabels = {
                  morning: { label: 'Morning', icon: '🌅', range: '6AM-12PM' },
                  afternoon: { label: 'Afternoon', icon: '☀️', range: '12PM-6PM' },
                  evening: { label: 'Evening', icon: '🌆', range: '6PM-12AM' },
                  night: { label: 'Night', icon: '🌙', range: '12AM-6AM' },
                };
                const info = timeLabels[time];

                return (
                  <AnimatedCard
                    key={time}
                    delay={0.35 + i * 0.05}
                    className={`p-4 ${isBest ? 'ring-1 ring-green-500/50' : isWorst ? 'ring-1 ring-red-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{info.label}</div>
                        <div className="text-xs text-zinc-500">{info.range}</div>
                      </div>
                    </div>
                    {total > 0 ? (
                      <>
                        <div className={`mt-3 text-2xl font-bold ${isBest ? 'text-green-400' : isWorst ? 'text-red-400' : 'text-white'}`}>
                          {(winRate * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-zinc-500">{total} games played</div>
                        <div className="mt-2">
                          <AnimatedProgressBar
                            value={winRate * 100}
                            color={isBest ? '#22c55e' : isWorst ? '#ef4444' : '#fff'}
                            delay={0.5 + i * 0.05}
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

            {/* Session Length Analysis */}
            <AnimatedCard delay={0.5} className="p-5 mt-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Session Length Analysis</div>
              <div className="grid gap-4 sm:grid-cols-3">
                {(['short', 'medium', 'long'] as const).map((length, i) => {
                  const lengthData = data.sessionInsights?.sessionLength?.[length] as any;
                  const winRate = lengthData?.winRate ?? 0;
                  const total = lengthData?.total ?? 0;
                  const isOptimal = data.sessionInsights?.sessionLength?.optimalLength === length;
                  const lengthLabels = {
                    short: { label: 'Short Sessions', games: '1-3 games', icon: '⚡' },
                    medium: { label: 'Medium Sessions', games: '4-7 games', icon: '🎯' },
                    long: { label: 'Long Sessions', games: '8+ games', icon: '🔥' },
                  };
                  const info = lengthLabels[length];

                  return (
                    <div
                      key={length}
                      className={`p-4 rounded-lg border ${
                        isOptimal
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-zinc-800/30 border-zinc-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{info.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{info.label}</div>
                          <div className="text-xs text-zinc-500">{info.games}</div>
                        </div>
                        {isOptimal && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Optimal
                          </span>
                        )}
                      </div>
                      {total > 0 ? (
                        <div className="mt-3">
                          <div className={`text-xl font-bold ${isOptimal ? 'text-purple-400' : 'text-white'}`}>
                            {(winRate * 100).toFixed(0)}% win rate
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

            {/* Current Status */}
            {data.sessionInsights.tilt.currentLossStreak > 0 && (
              <AnimatedCard delay={0.55} className="p-4 mt-4 bg-gradient-to-r from-zinc-900 to-zinc-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Current Status</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        data.sessionInsights.tilt.isTilting ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {data.sessionInsights.tilt.currentLossStreak} loss streak
                      </span>
                      {data.sessionInsights.tilt.isTilting && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                          Tilting
                        </span>
                      )}
                    </div>
                  </div>
                  {data.sessionInsights.tilt.tiltThreshold && (
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Threshold</div>
                      <div className="text-lg font-bold text-zinc-400">
                        {data.sessionInsights.tilt.currentLossStreak} / {data.sessionInsights.tilt.tiltThreshold}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            )}
          </section>
        )}

        {/* Daily Quests */}
        <section className="mt-8">
          <SectionHeader title="Daily Quests" subtitle={data.subscriptionActive ? "3 quests/day" : "1 quest/day"} />
          <div className="space-y-3">
            {data.quests.map((q, i) => {
              const pct = Math.round(((q.progress as any)?.pct ?? 0) * 100);
              const completed = q.status === "COMPLETED";
              return (
                <AnimatedCard key={q.id} delay={0.1 + i * 0.05} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white line-clamp-1" title={q.title}>{q.title}</div>
                        {completed && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30"
                          >
                            Complete
                          </motion.span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">{q.description}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          {domainLabels[q.domain] || q.domain}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          {q.modeEligibility}
                        </span>
                        {q.game && (
                          <span
                            className="px-2 py-0.5 rounded-full text-zinc-300"
                            style={{
                              backgroundColor: `${gameColors[q.game]?.primary}20`,
                              borderColor: `${gameColors[q.game]?.primary}40`,
                              borderWidth: 1
                            }}
                          >
                            {gameLabels[q.game] || q.game}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <div className="text-2xl font-bold text-white">
                        {completed ? '100' : <AnimatedNumber value={pct} duration={0.5} />}%
                      </div>
                      <div className="mt-2 w-24">
                        <AnimatedProgressBar
                          value={completed ? 100 : pct}
                          color={completed ? "#22c55e" : "#fff"}
                          delay={0.2 + i * 0.05}
                        />
                      </div>
                    </div>
                  </div>
                </AnimatedCard>
              );
            })}
          </div>
        </section>

        {/* Streaks & Milestones */}
        {data.streaksAndMilestones && (
          <section className="mt-8">
            <SectionHeader title="Streaks & Milestones" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Quest Streak */}
              {data.streaksAndMilestones.questStreak.current > 0 && (
                <AnimatedCard delay={0.1} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                      <span className="text-xl">🔥</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-400">
                        <AnimatedNumber value={data.streaksAndMilestones.questStreak.current} duration={0.5} />
                      </div>
                      <div className="text-xs text-zinc-500">Quest Streak</div>
                    </div>
                  </div>
                  {data.streaksAndMilestones.questStreak.best > data.streaksAndMilestones.questStreak.current && (
                    <div className="mt-2 text-xs text-zinc-600">
                      Best: {data.streaksAndMilestones.questStreak.best}
                    </div>
                  )}
                </AnimatedCard>
              )}

              {/* Per-game win/loss streaks */}
              {data.streaksAndMilestones.gameStreaks
                .filter((gs: any) => gs.currentStreak >= 2)
                .map((gs: any, i: number) => {
                  const colors = gameColors[gs.game] || gameColors.CS2;
                  const isWin = gs.streakType === "WIN";
                  return (
                    <AnimatedCard
                      key={gs.game}
                      delay={0.15 + i * 0.05}
                      className={`p-4 bg-gradient-to-br ${colors.gradient}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isWin ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          <span className="text-xl">{isWin ? '🏆' : '💀'}</span>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                            {gs.currentStreak}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {isWin ? 'Win' : 'Loss'} Streak
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-medium" style={{ color: colors.primary }}>
                        {gameLabels[gs.game] || gs.game}
                      </div>
                    </AnimatedCard>
                  );
                })}

              {/* Milestones */}
              {data.streaksAndMilestones.milestones
                .filter((m: any) => m.type !== 'win_streak') // win streaks shown above
                .map((m: any, i: number) => {
                  const colors = m.game ? (gameColors[m.game] || gameColors.CS2) : null;
                  return (
                    <AnimatedCard
                      key={`${m.type}-${m.game || 'all'}`}
                      delay={0.2 + i * 0.05}
                      className={`p-4 ${colors ? `bg-gradient-to-br ${colors.gradient}` : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                          <span className="text-xl">⭐</span>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{m.label}</div>
                          <div className="text-xs text-zinc-500">
                            {m.game ? (gameLabels[m.game] || m.game) : 'All Games'}
                          </div>
                        </div>
                      </div>
                    </AnimatedCard>
                  );
                })}

              {/* Empty state */}
              {data.streaksAndMilestones.questStreak.current === 0 &&
               data.streaksAndMilestones.gameStreaks.filter((gs: any) => gs.currentStreak >= 2).length === 0 &&
               data.streaksAndMilestones.milestones.length === 0 && (
                <AnimatedCard delay={0.1} className="p-6 text-center sm:col-span-2 lg:col-span-4">
                  <div className="text-zinc-500">Play some matches to start building streaks!</div>
                </AnimatedCard>
              )}
            </div>
          </section>
        )}

        {/* Skill Domains */}
        <section className="mt-8">
          <SectionHeader title="Skill Domains" subtitle="Cross-game · last 20 matches" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.skillScores.map((s, i) => {
              const details = (s as any).details;
              return (
                <Link href={`/dashboard/skill/${s.domain}`} key={s.domain}>
                  <AnimatedCard delay={0.1 + i * 0.05} className="p-4 h-full">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-zinc-200">
                        {domainLabels[s.domain] || s.domain}
                      </div>
                      <div className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                        <AnimatedNumber value={s.score} duration={0.8} />
                      </div>
                    </div>

                    {details?.attributionCounts && Object.keys(details.attributionCounts).length > 0 ? (
                      <GamePieChart counts={details.attributionCounts} />
                    ) : (
                      <div className="mt-4 text-xs text-zinc-600">No recent data</div>
                    )}

                    <div className="mt-4">
                      <AnimatedProgressBar value={s.score} color="#fff" delay={0.3 + i * 0.05} />
                    </div>
                  </AnimatedCard>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Current Ranks */}
        {data.ranks && Object.keys(data.ranks).length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Current Ranks" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.values(data.ranks).map((rank: any, i) => (
                <RankCard key={rank.game} rank={rank} delay={0.1 + i * 0.05} />
              ))}
            </div>
          </section>
        )}

        {/* Hero / Agent Breakdown */}
        <CharacterBreakdown />

        {/* Rewards */}
        <section className="mt-8">
          <SectionHeader title="Rewards" />
          {data.rewards.length === 0 ? (
            <AnimatedCard delay={0.1} className="p-6 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-zinc-400">Complete quests to unlock badges and share cards!</div>
            </AnimatedCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.rewards.map((r, i) => (
                <AnimatedCard key={r.id} delay={0.1 + i * 0.05} className="p-3 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.imageUrl} alt={r.title} className="w-full rounded-lg bg-black" />
                  <div className="mt-3">
                    <div className="font-medium text-white">{r.title}</div>
                    <div className="text-xs text-zinc-400">{r.caption}</div>
                    <div className="mt-3">
                      {r.isPublic && r.shareUrl ? (
                        <a
                          href={r.shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          View share link →
                        </a>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="text-xs rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-3 py-1.5 text-white"
                          onClick={async () => {
                            const res = await apiPost<{ ok: boolean; shareUrl: string }>(`/rewards/${r.id}/share`);
                            window.open(res.shareUrl, "_blank");
                            await load();
                          }}
                        >
                          Share reward
                        </motion.button>
                      )}
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 border-t border-zinc-800/50 pt-6 text-sm text-zinc-500"
        >
          <div className="flex flex-wrap gap-4">
            <button
              onClick={async () => {
                await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}/auth/logout`, { credentials: "include" });
                window.location.href = "/login";
              }}
              className="hover:text-zinc-300 transition-colors"
            >
              Log out
            </button>
            <a href={steamLinkUrl()} className="hover:text-zinc-300 transition-colors">
              Link Steam (CS2)
            </a>
            <Link href="/dashboard/settings" className="hover:text-zinc-300 transition-colors">
              Link Supercell
            </Link>
          </div>
          <div className="mt-4 text-xs text-zinc-600">
            Tactix — Cross-game coaching platform
          </div>
        </motion.footer>
    </div>
  );
}
