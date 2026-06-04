"use client";

import { motion } from "framer-motion";
import type { DashboardResponse } from "@tactix/shared";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { SectionHeader } from "@/components/SectionHeader";
import { gameColors, gameLabels, domainLabels } from "@/lib/gameTheme";
import { Target } from "@/components/icons";

export function DailyQuests({ data }: { data: DashboardResponse }) {
  return (
    <section className="mt-8">
      <SectionHeader
        title="Daily Quests"
        subtitle={data.subscriptionActive ? "3 quests/day" : "1 quest/day"}
        icon={Target}
      />
      <div className="space-y-3">
        {data.quests.map((q, i) => {
          const pct = Math.round(((q.progress as any)?.pct ?? 0) * 100);
          const completed = q.status === "COMPLETED";
          return (
            <AnimatedCard key={q.id} delay={0.05 + i * 0.05} className="p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <div className="font-semibold text-white">{q.title}</div>
                  {completed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
                    >
                      Complete
                    </motion.span>
                  )}
                </div>
                <div className="shrink-0 text-2xl font-bold text-white">
                  {completed ? "100" : <AnimatedNumber value={pct} duration={0.5} />}%
                </div>
              </div>
              <p className="mb-3 text-sm text-zinc-400">{q.description}</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                    {domainLabels[q.domain] || q.domain}
                  </span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                    {q.modeEligibility}
                  </span>
                  {q.game && (
                    <span
                      className="rounded-full px-2 py-0.5 text-zinc-300"
                      style={{
                        backgroundColor: `${gameColors[q.game]?.primary}20`,
                        borderColor: `${gameColors[q.game]?.primary}40`,
                        borderWidth: 1,
                      }}
                    >
                      {gameLabels[q.game] || q.game}
                    </span>
                  )}
                </div>
                <div className="w-24 shrink-0">
                  <AnimatedProgressBar
                    value={completed ? 100 : pct}
                    color={completed ? "#34d399" : "#e4e4e7"}
                    delay={0.15 + i * 0.05}
                  />
                </div>
              </div>
            </AnimatedCard>
          );
        })}
      </div>
    </section>
  );
}
