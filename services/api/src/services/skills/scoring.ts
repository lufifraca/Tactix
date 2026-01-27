import { prisma } from "../../prisma";
import type { SkillDomain } from "@tactix/shared";

type DomainScore = { domain: SkillDomain; score: number; details: Record<string, any>; attribution?: string[] };

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

function safeNum(v: any): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function ratio(a: number, b: number, fallback = 0): number {
  if (b <= 0) return fallback;
  return a / b;
}

function mean(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function score01HigherBetter(value: number, good: number, great: number) {
  // map [good..great] -> [0.6..1.0], below good down to 0
  if (value <= 0) return 0;
  if (value <= good) return clamp(value / good, 0, 1) * 0.6;
  if (value >= great) return 1;
  return 0.6 + ((value - good) / (great - good)) * 0.4;
}

function score01LowerBetter(value: number, ok: number, great: number) {
  // value <= great => 1, value >= ok => 0.6 down to 0
  if (value <= great) return 1;
  if (value >= ok) return clamp(1 - (value - ok) / ok, 0, 1) * 0.6;
  return 0.6 + (1 - (value - great) / (ok - great)) * 0.4;
}

export async function computeCrossGameSkillScores(userId: string, mode: "ALL" | "RANKED" | "UNRANKED") {
  // v1: score from most recent 20 matches across all linked games.
  const modeFilter =
    mode === "ALL"
      ? undefined
      : mode === "RANKED"
        ? { in: ["RANKED", "UNKNOWN"] as any }
        : { in: ["UNRANKED", "UNKNOWN"] as any };

  const matches = await prisma.match.findMany({
    where: { userId, ...(modeFilter ? { mode: modeFilter } : {}) },
    orderBy: [{ endedAt: "desc" }, { ingestedAt: "desc" }],
    take: 20,
    select: { normalizedStats: true, game: true, mode: true, durationSeconds: true },
  });

  const stats = matches.map((m) => ({
    ...((m.normalizedStats as any) ?? {}),
    matchDurationSeconds: (m.normalizedStats as any)?.matchDurationSeconds ?? m.durationSeconds ?? 0,
  }));

  const totals = {
    kills: stats.reduce((s, x) => s + safeNum(x.kills), 0),
    deaths: stats.reduce((s, x) => s + safeNum(x.deaths), 0),
    assists: stats.reduce((s, x) => s + safeNum(x.assists), 0),
    headshots: stats.reduce((s, x) => s + safeNum(x.headshots), 0),
    dmg: stats.reduce((s, x) => s + safeNum(x.damageDealt), 0),
    dmgTaken: stats.reduce((s, x) => s + safeNum(x.damageTaken), 0),
    heal: stats.reduce((s, x) => s + safeNum(x.healingDone), 0),
    obj: stats.reduce((s, x) => s + safeNum(x.objectiveTimeSeconds), 0),
    plants: stats.reduce((s, x) => s + safeNum(x.plants), 0),
    defuses: stats.reduce((s, x) => s + safeNum(x.defuses), 0),
    utilDmg: stats.reduce((s, x) => s + safeNum(x.utilityDamage), 0),
    flashA: stats.reduce((s, x) => s + safeNum(x.flashAssists), 0),
    firstW: stats.reduce((s, x) => s + safeNum(x.firstEngagementWins), 0),
    firstL: stats.reduce((s, x) => s + safeNum(x.firstEngagementLosses), 0),
    duration: stats.reduce((s, x) => s + safeNum(x.matchDurationSeconds), 0),
  };

  const kd = ratio(totals.kills, totals.deaths, totals.kills > 0 ? 1 : 0);
  const hsr = ratio(totals.headshots, totals.kills, 0);
  const dpm = ratio(totals.dmg, totals.duration / 60, 0);

  // MECHANICS (was Aim Quality)
  const mechanics = clamp(
    Math.round(
      100 *
      (0.45 * score01HigherBetter(kd, 1.0, 1.6) +
        0.35 * score01HigherBetter(hsr, 0.2, 0.45) +
        0.2 * score01HigherBetter(dpm, 250, 500))
    ),
    0,
    100
  );

  // AGGRESSION (was First Engagement)
  const firstTotal = totals.firstW + totals.firstL;
  const firstWinRate = firstTotal > 0 ? totals.firstW / firstTotal : 0.5;
  const aggression = clamp(Math.round(100 * score01HigherBetter(firstWinRate, 0.48, 0.58)), 0, 100);

  // VITALITY (was Survival Quality)
  const deathsPer10 = ratio(totals.deaths, totals.duration / 600, 0);
  const vitality = clamp(
    Math.round(100 * (0.65 * score01LowerBetter(deathsPer10, 10, 6) + 0.35 * score01HigherBetter(kd, 0.9, 1.4))),
    0,
    100
  );

  // OBJECTIVE (Unchanged)
  const objPerMatch = ratio(totals.obj, stats.length, 0);
  const plantDefuse = totals.plants + totals.defuses;
  const objective = clamp(
    Math.round(
      100 *
      (0.6 * score01HigherBetter(objPerMatch, 40, 90) + 0.4 * score01HigherBetter(plantDefuse, 2, 5))
    ),
    0,
    100
  );

  // TEAMWORK (was Utility Intent)
  const utilSignal = totals.utilDmg + totals.flashA * 120 + totals.heal * 0.15 + totals.assists * 50;
  const teamwork = clamp(Math.round(100 * score01HigherBetter(utilSignal, 1200, 2600)), 0, 100);

  // CONSISTENCY (Unchanged)
  const perMatchKd = stats.map((s) => ratio(safeNum(s.kills), safeNum(s.deaths), safeNum(s.kills) > 0 ? 1 : 0));
  const kdStd = stddev(perMatchKd);
  const consistency = clamp(Math.round(100 * score01LowerBetter(kdStd, 0.9, 0.45)), 0, 100);

  // VERSATILITY
  // Combine "Active Games" (matches in DB) with "Broad Experience" (Steam Library).
  const uniqueGames = new Set(matches.map(m => m.game)).size;

  let libraryCount = 0;
  try {
    const { listObjects, getObject } = await import("../storage");
    const keys = await listObjects(`raw/steam_library/${userId}/`);
    const latest = keys.sort().pop();
    if (latest) {
      const json = await getObject(latest);
      if (json) {
        const raw = JSON.parse(json);
        // Count games with > 2 hours (120 mins) of playtime
        libraryCount = (raw.games ?? []).filter((g: any) => g.playtime_forever > 120).length;
      }
    }
  } catch (e) {
    // ignore S3 errors, fallback to just match data
  }

  // Scoring: 
  // - 20 points per "Active" game (played recently)
  // - 2 points per "Archive" game (in library > 2h)
  const versRaw = (uniqueGames * 20) + (libraryCount * 2);
  const versatility = clamp(Math.round(versRaw), 0, 100);


  // Attribution logic: which games contributed?
  // We want match counts per game for the pie charts.
  const getAttributionCounts = (filterFn: (m: any) => boolean) => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      if (filterFn(m)) {
        counts[m.game] = (counts[m.game] ?? 0) + 1;
      }
    }
    return counts;
  };

  const scores: DomainScore[] = [
    {
      domain: "MECHANICS",
      score: mechanics,
      details: { kd, hsr, dpm, attributionCounts: getAttributionCounts(m => (m.stats?.cumulative?.headshots ?? m.stats?.headshots ?? 0) > 0 || (m.game === "CS2") || (m.game === "CLASH_ROYALE")) }
    },
    {
      domain: "AGGRESSION",
      score: aggression,
      details: { firstWinRate, firstTotal, attributionCounts: getAttributionCounts(m => (m.stats?.firstEngagementWins ?? 0) > 0 || m.game === "CS2" || m.game === "CLASH_ROYALE") }
    },
    {
      domain: "VITALITY",
      score: vitality,
      details: { kd, deathsPer10, attributionCounts: getAttributionCounts(m => (m.stats?.deaths ?? 0) > 0 || m.game.includes("_ROYALE")) }
    },
    {
      domain: "OBJECTIVE",
      score: objective,
      details: { objPerMatch, plantDefuse, attributionCounts: getAttributionCounts(m => (m.stats?.objectiveTimeSeconds ?? 0) > 0 || (m.stats?.plants ?? 0) > 0 || (m.stats?.crowns ?? 0) > 0) }
    },
    {
      domain: "TEAMWORK",
      score: teamwork,
      details: { utilSignal, attributionCounts: getAttributionCounts(m => (m.stats?.assists ?? 0) > 0 || (m.stats?.flashAssists ?? 0) > 0) }
    },
    {
      domain: "CONSISTENCY",
      score: consistency,
      details: { kdStd, attributionCounts: getAttributionCounts(m => true) }
    },
    {
      domain: "VERSATILITY",
      score: versatility,
      details: { uniqueGames, attributionCounts: getAttributionCounts(m => true) }
    },
  ];

  return scores;
}

export async function upsertDailySkillScores(userId: string, dateStr: string) {
  const computedAt = new Date();
  const scores = await computeCrossGameSkillScores(userId, "ALL");

  // Store as game=null (cross-game), mode=UNKNOWN (v1 uses ALL)
  for (const s of scores) {
    await prisma.skillScore.create({
      data: {
        userId,
        game: null,
        mode: "UNKNOWN",
        domain: s.domain as any,
        score: Math.round(s.score),
        computedAt,
        details: { ...(s.details ?? {}), attribution: s.attribution },
      },
    });
  }
}

export async function getSkillScoresForDashboard(userId: string) {
  // Grab latest score per domain and compare to ~7 days ago.
  const latest = await prisma.skillScore.findMany({
    where: { userId, game: null },
    orderBy: { computedAt: "desc" },
    take: 200,
  });

  const byDomainLatest = new Map<string, any>();
  const byDomainWeek = new Map<string, any>();

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const s of latest) {
    const d = s.domain;
    if (!byDomainLatest.has(d)) byDomainLatest.set(d, s);
    if (!byDomainWeek.has(d) && s.computedAt.getTime() <= weekAgo) byDomainWeek.set(d, s);
    if (byDomainLatest.size >= 7 && byDomainWeek.size >= 7) break;
  }

  const domains: SkillDomain[] = [
    "MECHANICS",
    "AGGRESSION",
    "VITALITY",
    "OBJECTIVE",
    "TEAMWORK",
    "CONSISTENCY",
    "VERSATILITY",
  ];

  return domains.map((d) => {
    const cur = byDomainLatest.get(d);
    const prev = byDomainWeek.get(d);
    const score = cur?.score ?? 0;
    const delta7d = prev ? score - prev.score : 0;
    const attribution = (cur?.details as any)?.attribution ?? [];
    return { domain: d, score, delta7d, details: cur?.details ?? undefined, attribution };
  });
}
