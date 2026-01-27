import type { QuestCriteria } from "@tactix/shared";
import { CanonicalMatchStats } from "@tactix/shared";

export type QuestProgress = {
  current: number;
  target: number;
  pct: number; // 0..1
  completed: boolean;
  detail: Record<string, any>;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function getMetric(stats: any, metric: string): number {
  // Derived metrics
  if (metric === "matchesPlayed") return 1; // per-match contribution; caller sums.
  if (metric === "firstEngagementTotal") {
    const w = typeof stats.firstEngagementWins === "number" ? stats.firstEngagementWins : 0;
    const l = typeof stats.firstEngagementLosses === "number" ? stats.firstEngagementLosses : 0;
    return w + l;
  }

  const v = stats?.[metric];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

export function evaluateQuest(criteria: QuestCriteria, matches: { stats: any }[]): QuestProgress {
  if (criteria.type === "aggregate") {
    const current = matches.reduce((sum, m) => sum + getMetric(m.stats, criteria.metric), 0);
    const target = criteria.target;
    const completed = criteria.op === ">=" ? current >= target : current <= target;
    const pct =
      criteria.op === ">="
        ? clamp01(target <= 0 ? 1 : current / target)
        : clamp01(target <= 0 ? 1 : (target - current) / target); // for <=, pct is "how far under cap"
    return { current, target, pct, completed, detail: { op: criteria.op, metric: criteria.metric } };
  }

  if (criteria.type === "rate") {
    const numerator = matches.reduce((sum, m) => sum + getMetric(m.stats, criteria.numerator), 0);
    const denominator = matches.reduce((sum, m) => sum + getMetric(m.stats, criteria.denominator), 0);
    const target = criteria.target;
    const ratio = denominator > 0 ? numerator / denominator : 0;
    const minDen = criteria.minDenominator ?? 0;
    const completed =
      denominator >= minDen && (criteria.op === ">=" ? ratio >= target : ratio <= target);
    const pct =
      criteria.op === ">="
        ? clamp01(target <= 0 ? 1 : ratio / target)
        : clamp01(target <= 0 ? 1 : (target - ratio) / target);
    return {
      current: ratio,
      target,
      pct,
      completed,
      detail: { numerator, denominator, minDenominator: minDen, ratio },
    };
  }

  // perMatch
  const passing = matches.filter((m) => {
    const v = getMetric(m.stats, criteria.metric);
    return criteria.op === ">=" ? v >= criteria.target : v <= criteria.target;
  }).length;

  const needed = criteria.minMatches;
  const pct = clamp01(passing / needed);
  const completed = passing >= needed;
  return { current: passing, target: needed, pct, completed, detail: { metric: criteria.metric, perMatchTarget: criteria.target } };
}
