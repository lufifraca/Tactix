"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark } from "@/components/BrandMark";
import { apiGet, apiPatch, apiPost, getDashboard } from "@/lib/api";
import type { DashboardResponse } from "@tactix/shared";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { CharacterBreakdown } from "@/components/CharacterBreakdown";
import { HeroStats } from "@/components/dashboard/HeroStats";
import { AICoachCard } from "@/components/dashboard/AICoachCard";
import { TiltAlert } from "@/components/dashboard/TiltAlert";
import { SessionIntelligence } from "@/components/dashboard/SessionIntelligence";
import { DailyQuests } from "@/components/dashboard/DailyQuests";
import { StreaksMilestones } from "@/components/dashboard/StreaksMilestones";
import { SkillDomains } from "@/components/dashboard/SkillDomains";
import { CurrentRanks } from "@/components/dashboard/CurrentRanks";
import { RewardsGrid } from "@/components/dashboard/RewardsGrid";
import { Crown, RefreshCw, LogOut, Sliders } from "@/components/icons";

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
          }
        }
      } catch {
        // Non-fatal
      }
    }
    syncTimezone();
  }, []);

  // Auto-refresh stats only "every once in a while" — when the data is more than
  // 30 minutes stale. This means a fresh login (or returning after a while) pulls
  // new matches, but bouncing between tabs (Matches/Settings → Dashboard) does NOT
  // re-ingest each time. The manual "Refresh" button always forces a sync.
  const AUTO_REFRESH_STALE_MS = 30 * 60 * 1000; // 30 minutes
  const hasAutoRefreshed = useRef(false);
  useEffect(() => {
    if (!data || refreshing || hasAutoRefreshed.current) return;
    const lastIngest = data.lastIngestAt ? new Date(data.lastIngestAt).getTime() : 0;
    const isStale = Date.now() - lastIngest > AUTO_REFRESH_STALE_MS;
    if (isStale && data.linkedAccounts && data.linkedAccounts.length > 0) {
      hasAutoRefreshed.current = true;
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.lastIngestAt, data?.linkedAccounts?.length]);

  async function refresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      // Ingestion now runs in the background server-side (a full sync can exceed
      // the request timeout), so we just kick it off and reload as results land.
      await apiPost("/ingest/refresh");
      setRefreshMsg({ type: "success", text: "Syncing… new matches will appear in a moment (can take up to a minute)." });
      setTimeout(() => { load(); }, 8000);
      setTimeout(() => { load(); }, 25000);
    } catch (e: any) {
      setRefreshMsg({ type: "error", text: e?.message ?? "Refresh failed" });
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-display bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-3xl font-bold text-transparent">
            {isAuthError ? "Welcome to Tactix" : "Something went wrong"}
          </h1>
          <p className="mx-auto mt-4 max-w-lg break-words text-zinc-400">{err ?? "Loading your dashboard..."}</p>
          {isAuthError ? (
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-steel-400 to-steel-700 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign in to continue
            </Link>
          ) : (
            <button
              onClick={() => load()}
              className="mt-6 inline-block rounded-lg bg-gradient-to-r from-steel-400 to-steel-700 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
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
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-4">
            <BrandMark size={48} />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50">Dashboard</h1>
              <p className="mt-0.5 text-xs text-zinc-500">Your performance at a glance</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                data.subscriptionActive
                  ? "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {data.subscriptionActive && <Crown size={12} />}
              {data.subscriptionActive ? "Pro" : "Free"}
            </span>
            <span>·</span>
            <span>Last sync: {data.lastIngestAt ? new Date(data.lastIngestAt).toLocaleTimeString() : "—"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-steel-400 to-steel-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-steel-400/20 transition-shadow hover:shadow-steel-400/30 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Syncing..." : "Refresh stats"}
          </motion.button>

          {/* Admin-only: toggle Pro (server-gated via data.isAdmin) */}
          {data.isAdmin && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                const res = await apiPost<any>("/dashboard/debug/toggle-pro");
                alert(`Pro is now ${res.subscriptionActive ? "ON" : "OFF"}`);
                await load();
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                data.subscriptionActive
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {data.subscriptionActive ? "Pro ON" : "Enable Pro"}
            </motion.button>
          )}

        </div>
      </motion.header>

      {/* Refresh result message */}
      <AnimatePresence>
        {refreshMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-3 rounded-lg border px-4 py-2.5 text-sm ${
              refreshMsg.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : refreshMsg.type === "warn"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="break-all">{refreshMsg.text}</span>
              <button onClick={() => setRefreshMsg(null)} className="shrink-0 opacity-60 hover:opacity-100">
                &times;
              </button>
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
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              mode === m
                ? "bg-white text-zinc-900 shadow-lg shadow-white/10"
                : "border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
            }`}
          >
            {m === "ALL" ? "All Modes" : m === "RANKED" ? "Ranked" : "Unranked"}
          </button>
        ))}
      </motion.section>

      {/* Hero stats bento */}
      <div className="mt-6">
        <HeroStats data={data} />
      </div>

      {/* AI Coach */}
      <AICoachCard isPro={!!data.subscriptionActive} />

      {/* Tilt alert */}
      <TiltAlert data={data} />

      {/* Sections */}
      <SessionIntelligence data={data} />
      <DailyQuests data={data} />
      <StreaksMilestones data={data} />
      <SkillDomains data={data} />
      <CurrentRanks data={data} />
      <CharacterBreakdown />
      <RewardsGrid data={data} onChange={load} />

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-12 border-t border-zinc-800/50 pt-6 text-sm text-zinc-500"
      >
        <div className="flex flex-wrap gap-4">
          <button
            onClick={async () => {
              await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}/auth/logout`, { credentials: "include" });
              window.location.href = "/login";
            }}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-300"
          >
            <LogOut size={14} /> Log out
          </button>
          <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-300">
            <Sliders size={14} /> Link Games
          </Link>
        </div>
        <div className="mt-4 text-xs text-zinc-600">Tactix — Cross-game coaching platform</div>
      </motion.footer>
    </div>
  );
}
