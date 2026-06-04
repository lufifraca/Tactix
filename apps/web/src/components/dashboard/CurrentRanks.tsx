"use client";

import type { DashboardResponse } from "@tactix/shared";
import { SectionHeader } from "@/components/SectionHeader";
import { TrackedGameCard } from "@/components/TrackedGameCard";
import { Crown } from "@/components/icons";

export function CurrentRanks({ data }: { data: DashboardResponse }) {
  const accounts = (data.linkedAccounts ?? []).filter((a) => a.game !== "CS2");
  if (accounts.length === 0) return null;

  return (
    <section className="mt-8">
      <SectionHeader title="Current Ranks" subtitle={`${accounts.length} accounts`} icon={Crown} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {accounts.map((account, i) => (
          <TrackedGameCard
            key={account.id}
            game={account.game}
            displayName={account.displayName}
            provider={account.provider}
            rank={data.ranks?.[account.game] || null}
            delay={0.05 + i * 0.05}
          />
        ))}
      </div>
    </section>
  );
}
