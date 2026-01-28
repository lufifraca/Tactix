import { QUEST_TEMPLATES } from "./questTemplates";
import { prisma } from "../../prisma";
import type { QuestCriteria, QuestTemplate, SkillDomain } from "@tactix/shared";
import { evaluateQuest } from "./scoring";
import { computeCrossGameSkillScores } from "../skills/scoring";
import { grantRewardForQuestCompletion, grantDailyClearRewardIfEligible } from "../rewards/grant";
import { bumpStreakOnDate } from "../streak/streak";
import { env } from "../../env";

function utcDateStart(dateStr: string): Date {
  // dateStr: YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function domainLabel(d: SkillDomain): string {
  switch (d) {
    case "MECHANICS": return "Mechanics";
    case "AGGRESSION": return "Aggression";
    case "VITALITY": return "Vitality";
    case "OBJECTIVE": return "Objective";
    case "TEAMWORK": return "Teamwork";
    case "CONSISTENCY": return "Consistency";
    case "VERSATILITY": return "Versatility";
    default: return d;
  }
}

function guidanceForDomain(d: SkillDomain): string {
  switch (d) {
    case "MECHANICS":
      return "Focus on raw input precision and execution speed.";
    case "AGGRESSION":
      return "Take initiative: find the opening pick or push the advantage.";
    case "VITALITY":
      return "Stay alive. You can't impact the game from the respawn screen.";
    case "OBJECTIVE":
      return "Play the win condition: time, crowns, or payload.";
    case "TEAMWORK":
      return "Enable your allies with utility, heals, or support.";
    case "CONSISTENCY":
      return "Minimize mistakes and keep your performance steady.";
    case "VERSATILITY":
      return "Broaden your horizons by playing different modes or games.";
    default:
      return "Focus on your fundamentals.";
  }
}

async function pickDailyTemplates(userId: string, count: number): Promise<QuestTemplate[]> {
  const accounts = await prisma.gameAccount.findMany({ where: { userId } });
  const games = new Set(accounts.map((a) => a.game));
  const eligible = QUEST_TEMPLATES.filter((t) => t.eligibleGames.some((g) => games.has(g)));

  // Use lowest skill domains to steer selection (cross-game).
  const scores = await computeCrossGameSkillScores(userId, "ALL");
  const orderedDomains = [...scores].sort((a, b) => a.score - b.score).map((s) => s.domain);

  const picked: QuestTemplate[] = [];
  for (const domain of orderedDomains) {
    const candidates = eligible.filter((t) => t.domain === domain && !picked.some((p) => p.id === t.id));
    if (candidates.length === 0) continue;

    // Simple weighted pick by weight.
    const total = candidates.reduce((s, c) => s + (c.weight ?? 1), 0);
    let r = Math.random() * total;
    let chosen = candidates[0];
    for (const c of candidates) {
      r -= c.weight ?? 1;
      if (r <= 0) {
        chosen = c;
        break;
      }
    }
    picked.push(chosen);
    if (picked.length >= count) break;
  }

  // If still not enough (new users), fill from any eligible.
  while (picked.length < count && eligible.length) {
    const c = eligible[Math.floor(Math.random() * eligible.length)];
    if (!picked.some((p) => p.id === c.id)) picked.push(c);
  }

  return picked.slice(0, count);
}

async function computeBaselineMetric(userId: string, metric: string, days: number = 7): Promise<number | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const matches = await prisma.match.findMany({
    where: { userId, endedAt: { gte: since } },
    select: { normalizedStats: true, endedAt: true },
  });
  if (matches.length === 0) return null;

  // Group by UTC day
  const perDay = new Map<string, number>();
  for (const m of matches) {
    const d = m.endedAt ? m.endedAt.toISOString().slice(0, 10) : "unknown";
    const stats: any = m.normalizedStats;
    const v = typeof stats?.[metric] === "number" ? stats[metric] : 0;
    perDay.set(d, (perDay.get(d) ?? 0) + v);
  }
  const vals = [...perDay.values()].filter((x) => Number.isFinite(x));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

async function personalizeCriteria(userId: string, criteria: QuestCriteria): Promise<QuestCriteria> {
  if (criteria.type === "aggregate") {
    const baseline = await computeBaselineMetric(userId, criteria.metric, 7);
    if (baseline && baseline > 0) {
      // Nudge target to ~110% of baseline, with sane bounds.
      const t = Math.round(baseline * 1.1);
      const min = Math.round(criteria.target * 0.6);
      const max = Math.round(criteria.target * 1.8);
      return { ...criteria, target: Math.max(min, Math.min(max, t)) };
    }
  }

  if (criteria.type === "rate") {
    // keep rate targets stable in v1 (too noisy)
    return criteria;
  }

  if (criteria.type === "perMatch") {
    return criteria;
  }

  return criteria;
}

export async function ensureDailyQuests(userId: string, dateStr: string, questCount: number, isPremium: boolean) {
  const date = utcDateStart(dateStr);
  const existing = await prisma.quest.findMany({
    where: { userId, date },
    orderBy: { slot: "asc" },
  });

  // If already have the correct count, nothing to do
  if (existing.length === questCount) return;

  // Wipe existing if wrong count (e.g., upgrade/downgrade mid-day, or free user showing 3 quests)
  if (existing.length > 0) {
    await prisma.quest.deleteMany({ where: { userId, date } });
  }

  const templates = await pickDailyTemplates(userId, questCount);

  // Fetch recent performance context for AI personalization (optional optimization: fetch only if AI enabled)
  const recentBrief = await prisma.dailyBrief.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { bullets: true },
  });
  const context = recentBrief ? JSON.stringify(recentBrief.bullets) : "No recent data.";

  const { enhanceQuestMetadata } = await import("../ai/questGenerator");

  for (let slot = 0; slot < templates.length; slot++) {
    const t = templates[slot];
    const criteria = await personalizeCriteria(userId, t.criteria as any);

    // AI Enhancement (Parallelize if slow, but safe here for background job)
    const { title, description } = await enhanceQuestMetadata(t.id, t.title, t.description, context);

    await prisma.quest.create({
      data: {
        userId,
        date,
        slot,
        isPremium: isPremium && slot > 0, // free slot 0, premium slots 1..2
        game: (criteria as any).game ?? null,
        domain: t.domain,
        title,            // AI-enhanced
        description,      // AI-enhanced
        modeEligibility: (criteria as any).mode ?? "ALL",
        criteria: criteria as any,
        progress: { current: 0, target: (criteria as any).target ?? 0, pct: 0, completed: false },
        status: "ACTIVE",
      },
    });
  }
}

export async function recomputeQuestProgress(userId: string, dateStr: string) {
  const date = utcDateStart(dateStr);
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const quests = await prisma.quest.findMany({
    where: { userId, date },
    orderBy: { slot: "asc" },
  });

  const requiredCount = quests.length;

  for (const q of quests) {
    if (q.status === "EXPIRED") continue;

    const criteria = q.criteria as any as QuestCriteria;

    const wasCompleted = q.status === "COMPLETED";


    const matches = await prisma.match.findMany({
      where: {
        userId,
        endedAt: { gte: date, lt: next },
        ...(criteria.game ? { game: criteria.game as any } : {}),
        // Mode filtering is applied at the UI level; for scoring we use all eligible matches in v1.
      },
      select: { normalizedStats: true, game: true, mode: true },
    });

    // Normalize "matchesPlayed" derived metric: each match contributes 1
    const enriched = matches.map((m) => {
      const stats: any = m.normalizedStats ?? {};
      return { stats: { ...stats, matchesPlayed: 1 } };
    });

    const progress = evaluateQuest(criteria, enriched as any);

    const status = progress.completed ? "COMPLETED" : "ACTIVE";
    await prisma.quest.update({
      where: { id: q.id },
      data: {
        progress: progress as any,
        status,
        completedAt: progress.completed ? q.completedAt ?? new Date() : null,
      },
    });

    if (!wasCompleted && progress.completed) {
      await grantRewardForQuestCompletion({ userId, questId: q.id, dateStr, webBaseUrl: env.WEB_BASE_URL });
      await bumpStreakOnDate(userId, dateStr);
      await grantDailyClearRewardIfEligible({ userId, dateStr, webBaseUrl: env.WEB_BASE_URL, requiredCount });
    }

  }
}

export async function ensureDailyBrief(userId: string, dateStr: string) {
  const date = utcDateStart(dateStr);
  const existing = await prisma.dailyBrief.findUnique({ where: { userId_date: { userId, date } } });
  if (existing) return;

  const quests = await prisma.quest.findMany({ where: { userId, date }, orderBy: { slot: "asc" } });
  if (quests.length === 0) return;

  const focusDomain = quests[0].domain as any as SkillDomain;
  const scores = await computeCrossGameSkillScores(userId, "ALL");
  const focusScore = scores.find((s) => s.domain === focusDomain)?.score ?? null;

  const bullets: [string, string, string] = [
    `Today's focus: ${domainLabel(focusDomain)}.`,
    focusScore !== null
      ? `Supporting stat: your ${domainLabel(focusDomain)} score is ${focusScore}/100 over recent matches.`
      : `Supporting stat: build momentum by completing your first quest.`,
    `Action: ${guidanceForDomain(focusDomain)}`
  ];

  await prisma.dailyBrief.create({ data: { userId, date, bullets } });
}
