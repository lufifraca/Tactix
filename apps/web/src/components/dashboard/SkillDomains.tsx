"use client";

import Link from "next/link";
import type { DashboardResponse } from "@tactix/shared";
import { AnimatedCard } from "@/components/AnimatedCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { GamePieChart } from "@/components/GamePieChart";
import { SectionHeader } from "@/components/SectionHeader";
import { domainLabels } from "@/lib/gameTheme";
import { domainMeta } from "@/lib/uiMaps";
import { Activity, ChevronRight, TrendingUp, TrendingDown } from "@/components/icons";

export function SkillDomains({ data }: { data: DashboardResponse }) {
  const domains = data.skillScores.filter((s) => s.domain !== "OBJECTIVE");
  if (domains.length === 0) return null;

  return (
    <section className="mt-8">
      <SectionHeader title="Skill Domains" subtitle="Cross-game · last 20 matches" icon={Activity} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((s, i) => {
          const details = (s as any).details;
          const meta = domainMeta[s.domain];
          const Icon = meta?.icon ?? Activity;
          const delta = (s as any).delta7d ?? 0;
          return (
            <Link href={`/dashboard/skill/${s.domain}`} key={s.domain}>
              <AnimatedCard delay={0.05 + i * 0.05} interactive className="group h-full p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/70 text-steel-300">
                      <Icon size={17} />
                    </span>
                    <div>
                      <div className="font-semibold text-zinc-100">
                        {domainLabels[s.domain] || s.domain}
                      </div>
                      {meta?.blurb && <div className="text-xs text-zinc-500">{meta.blurb}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold tabular-nums text-white">
                      <AnimatedNumber value={s.score} duration={0.8} />
                    </div>
                    {delta !== 0 && (
                      <div
                        className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
                          delta > 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(delta)}
                      </div>
                    )}
                  </div>
                </div>

                {details?.attributionCounts && Object.keys(details.attributionCounts).length > 0 ? (
                  <GamePieChart counts={details.attributionCounts} />
                ) : (
                  <div className="mt-4 text-xs text-zinc-600">No recent data</div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1">
                    <AnimatedProgressBar value={s.score} color="#e4e4e7" delay={0.2 + i * 0.05} />
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-zinc-600 transition-colors group-hover:text-zinc-300"
                  />
                </div>
              </AnimatedCard>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
