"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CoachReport, CoachResponse } from "@tactix/shared";
import { apiGet } from "@/lib/api";
import { coachIcons } from "@/lib/uiMaps";
import { Sparkles, RefreshCw, Activity } from "@/components/icons";

const toneStyles: Record<string, { ring: string; icon: string; chip: string }> = {
  positive: { ring: "ring-emerald-500/20", icon: "text-emerald-400", chip: "bg-emerald-500/10" },
  warning: { ring: "ring-amber-500/20", icon: "text-amber-400", chip: "bg-amber-500/10" },
  neutral: { ring: "ring-white/5", icon: "text-steel-300", chip: "bg-zinc-800/70" },
};

export function AICoachCard({ isPro = false }: { isPro?: boolean }) {
  const [report, setReport] = useState<CoachReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `force` regenerates instead of returning the cached daily report. The server
  // only honors it for Pro accounts; free accounts get the cached report (1/day).
  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<CoachResponse>(`/dashboard/coach${force ? "?refresh=1" : ""}`);
      if (res.ok && res.report) setReport(res.report);
      else setError(res.error ?? "Coach is unavailable right now.");
    } catch {
      setError("Coach is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mt-6">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-5">
        {/* ambient accent */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-steel-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-steel-600/10 blur-3xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-steel-400/30 to-steel-600/30 text-steel-200 ring-1 ring-inset ring-white/10">
                <Sparkles size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-100">
                    AI Coach
                  </h2>
                  {report && (
                    <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 ring-1 ring-inset ring-white/5">
                      {report.source === "ai" ? "Live AI" : "Insights"}
                    </span>
                  )}
                </div>
                {report ? (
                  <p className="mt-0.5 text-lg font-semibold text-white">{report.headline}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-zinc-500">Reading your recent matches…</p>
                )}
              </div>
            </div>

            {isPro ? (
              <button
                onClick={() => load(true)}
                disabled={loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700/70 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200 disabled:opacity-50"
                aria-label="Regenerate insights"
                title="Regenerate insights"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            ) : (
              <span
                className="flex shrink-0 items-center rounded-lg border border-steel-600/40 bg-steel-600/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-steel-300"
                title="Your coach refreshes once a day. Upgrade to Pro to regenerate on demand."
              >
                Pro
              </span>
            )}
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-5 grid gap-3 sm:grid-cols-2"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-zinc-800/60 bg-zinc-800/20"
                  />
                ))}
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex items-center gap-2 text-sm text-zinc-500"
              >
                <Activity size={15} />
                {error}
              </motion.div>
            ) : report ? (
              <motion.div
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.insights.map((ins, i) => {
                    const Icon = coachIcons[ins.icon] ?? Activity;
                    const tone = toneStyles[ins.tone] ?? toneStyles.neutral;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`flex gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3.5 ring-1 ring-inset ${tone.ring}`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.chip} ${tone.icon}`}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{ins.title}</div>
                          <div className="mt-0.5 text-sm leading-snug text-zinc-400">{ins.body}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Focus recommendation */}
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-steel-400/20 bg-steel-400/[0.06] p-3.5">
                  <span className="mt-0.5 rounded-md bg-steel-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-steel-200">
                    Focus
                  </span>
                  <p className="text-sm leading-snug text-zinc-300">{report.focus}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
