"use client";

import { motion } from "framer-motion";
import type { DashboardResponse } from "@tactix/shared";
import { AnimatedCard } from "@/components/AnimatedCard";
import { SectionHeader } from "@/components/SectionHeader";
import { apiPost } from "@/lib/api";
import { Trophy, ChevronRight } from "@/components/icons";

export function RewardsGrid({ data, onChange }: { data: DashboardResponse; onChange: () => void }) {
  return (
    <section className="mt-8">
      <SectionHeader title="Rewards" icon={Trophy} />
      {data.rewards.length === 0 ? (
        <AnimatedCard delay={0.05} className="p-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/70 text-zinc-500">
            <Trophy size={24} />
          </span>
          <div className="text-zinc-400">Complete quests to unlock badges and share cards!</div>
        </AnimatedCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.rewards.map((r, i) => (
            <AnimatedCard key={r.id} delay={0.05 + i * 0.05} className="overflow-hidden p-3">
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
                      className="inline-flex items-center gap-1 text-xs text-steel-300 transition-colors hover:text-steel-200"
                    >
                      View share link <ChevronRight size={13} />
                    </a>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="rounded-lg bg-gradient-to-r from-steel-400 to-steel-700 px-3 py-1.5 text-xs text-white"
                      onClick={async () => {
                        const res = await apiPost<{ ok: boolean; shareUrl: string }>(
                          `/rewards/${r.id}/share`
                        );
                        window.open(res.shareUrl, "_blank");
                        onChange();
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
  );
}
