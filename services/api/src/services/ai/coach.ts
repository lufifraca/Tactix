import { prisma } from "../../prisma";
import { getSessionInsights } from "../sessions";
import { computeCrossGameSkillScores } from "../skills/scoring";
import { completeJson, activeProvider } from "./llm";

export type CoachTone = "positive" | "warning" | "neutral";

export interface CoachInsight {
  icon: string; // hint key resolved to an icon on the client (see uiMaps.coachIcons)
  title: string;
  body: string;
  tone: CoachTone;
}

export interface CoachReport {
  headline: string;
  insights: CoachInsight[];
  focus: string;
  source: "ai" | "rules";
  generatedAt: string;
}

const DOMAIN_LABEL: Record<string, string> = {
  MECHANICS: "Mechanics",
  AGGRESSION: "Aggression",
  VITALITY: "Vitality",
  TEAMWORK: "Teamwork",
  CONSISTENCY: "Consistency",
  VERSATILITY: "Versatility",
  OBJECTIVE: "Objectives",
};

const GAME_LABEL: Record<string, string> = {
  MARVEL_RIVALS: "Marvel Rivals",
  VALORANT: "Valorant",
  CLASH_ROYALE: "Clash Royale",
  BRAWL_STARS: "Brawl Stars",
};

const pct = (x: number | null | undefined) =>
  x == null ? "—" : `${Math.round(x * 100)}%`;

// ── Snapshot ────────────────────────────────────────────────────────────────
interface CoachSnapshot {
  displayName: string | null;
  totalMatches: number;
  today: { matches: number; wins: number; losses: number; winRate: number | null };
  currentLossStreak: number;
  bestWinStreak: { game: string; n: number } | null;
  bestTime: string | null;
  bestTimeWinRate: number | null;
  worstTime: string | null;
  bestDay: string | null;
  optimalLength: string | null;
  tiltThreshold: number | null;
  isTilting: boolean;
  topSkill: { domain: string; score: number } | null;
  weakSkill: { domain: string; score: number } | null;
  games: string[];
}

export async function buildCoachSnapshot(userId: string): Promise<CoachSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [todayMatches, totalMatches, accounts] = await Promise.all([
    prisma.match.findMany({
      where: { userId, startedAt: { gte: dayStart, lt: dayEnd } },
      select: { result: true },
    }),
    prisma.match.count({ where: { userId } }),
    prisma.gameAccount.findMany({
      where: { userId },
      select: { game: true },
      distinct: ["game"],
    }),
  ]);

  const wins = todayMatches.filter((m) => m.result === "WIN").length;
  const losses = todayMatches.filter((m) => m.result === "LOSS").length;

  // Best current win streak across games (last 20 each).
  let bestWinStreak: { game: string; n: number } | null = null;
  for (const a of accounts) {
    if (a.game === "CS2") continue;
    const recent = await prisma.match.findMany({
      where: { userId, game: a.game },
      orderBy: { endedAt: "desc" },
      take: 20,
      select: { result: true },
    });
    if (recent[0]?.result !== "WIN") continue;
    let n = 0;
    for (const m of recent) {
      if (m.result === "WIN") n++;
      else break;
    }
    if (!bestWinStreak || n > bestWinStreak.n) bestWinStreak = { game: a.game, n };
  }

  let session: any = null;
  try {
    session = await getSessionInsights(userId, null);
  } catch {
    /* non-fatal */
  }

  let skills: Array<{ domain: string; score: number }> = [];
  try {
    skills = (await computeCrossGameSkillScores(userId, "ALL")).map((s) => ({
      domain: s.domain,
      score: s.score,
    }));
  } catch {
    /* non-fatal */
  }
  const ranked = skills.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  return {
    displayName: user?.displayName ?? null,
    totalMatches,
    today: {
      matches: todayMatches.length,
      wins,
      losses,
      winRate: todayMatches.length > 0 ? wins / todayMatches.length : null,
    },
    currentLossStreak: session?.tilt?.currentLossStreak ?? 0,
    bestWinStreak,
    bestTime: session?.timeOfDay?.bestTime ?? null,
    bestTimeWinRate: session?.timeOfDay?.bestTime
      ? session.timeOfDay[session.timeOfDay.bestTime]?.winRate ?? null
      : null,
    worstTime: session?.timeOfDay?.worstTime ?? null,
    bestDay: session?.dayOfWeek?.bestDay ?? null,
    optimalLength: session?.sessionLength?.optimalLength ?? null,
    tiltThreshold: session?.tilt?.tiltThreshold ?? null,
    isTilting: session?.tilt?.isTilting ?? false,
    topSkill: ranked[0] ?? null,
    weakSkill: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    games: accounts.map((a) => a.game).filter((g) => g !== "CS2"),
  };
}

// ── Deterministic fallback (always available, demo-safe) ─────────────────────
export function buildRulesReport(s: CoachSnapshot): CoachReport {
  const insights: CoachInsight[] = [];

  // Tilt / loss streak.
  if (s.isTilting || (s.tiltThreshold != null && s.currentLossStreak >= s.tiltThreshold)) {
    insights.push({
      icon: "shield",
      title: `You're on a ${s.currentLossStreak}-loss skid`,
      body:
        s.tiltThreshold != null
          ? `Your win rate historically drops after ${s.tiltThreshold} straight losses. Step away for 15–20 minutes before you queue again.`
          : `Take a short break to reset — chasing losses rarely turns the session around.`,
      tone: "warning",
    });
  } else if (s.bestWinStreak && s.bestWinStreak.n >= 3) {
    insights.push({
      icon: "flame",
      title: `${s.bestWinStreak.n}-game win streak`,
      body: `You're heating up in ${GAME_LABEL[s.bestWinStreak.game] ?? s.bestWinStreak.game}. Ride the momentum, but watch for fatigue creeping in.`,
      tone: "positive",
    });
  }

  // Best time window.
  if (s.bestTime && s.bestTimeWinRate != null) {
    insights.push({
      icon: "clock",
      title: `You peak in the ${s.bestTime}`,
      body: `You win ${pct(s.bestTimeWinRate)} of matches in the ${s.bestTime}${
        s.worstTime ? `, versus your weakest stretch in the ${s.worstTime}` : ""
      }. Schedule ranked grinds for that window.`,
      tone: "positive",
    });
  }

  // Session length sweet spot.
  if (s.optimalLength) {
    const label =
      s.optimalLength === "short" ? "1–3 game" : s.optimalLength === "medium" ? "4–7 game" : "longer";
    insights.push({
      icon: "gauge",
      title: `Your sweet spot is ${label} sessions`,
      body: `That's where your win rate is highest. When a session runs long, your results tend to slide — quit while you're ahead.`,
      tone: "neutral",
    });
  }

  // Skill standout.
  if (s.topSkill) {
    insights.push({
      icon: "star",
      title: `Strongest area: ${DOMAIN_LABEL[s.topSkill.domain] ?? s.topSkill.domain}`,
      body: `Scoring ${s.topSkill.score}/100 across your recent matches. Lean into the playstyle that's working.`,
      tone: "positive",
    });
  }

  // Headline.
  let headline = "Here's your read for today.";
  if (s.today.winRate != null && s.today.winRate >= 0.6) headline = "Locked in — keep it rolling.";
  else if (s.isTilting) headline = "Time to reset and regroup.";
  else if (s.bestWinStreak && s.bestWinStreak.n >= 3) headline = "You're on a heater.";
  else if (s.today.matches === 0) headline = "Ready when you are.";

  // Focus recommendation.
  let focus: string;
  if (s.weakSkill) {
    focus = `This week, put reps into ${DOMAIN_LABEL[s.weakSkill.domain] ?? s.weakSkill.domain} (your lowest area at ${s.weakSkill.score}/100). Small gains there move your overall game the most.`;
  } else if (s.bestTime && s.optimalLength) {
    const label = s.optimalLength === "short" ? "3" : s.optimalLength === "medium" ? "7" : "more";
    focus = `Queue your next ranked session in the ${s.bestTime} and cap it around ${label} games — that's statistically your peak window.`;
  } else {
    focus = `Play a few more matches so I can spot the patterns in when and how you perform best.`;
  }

  return {
    headline,
    insights: insights.slice(0, 4),
    focus,
    source: "rules",
    generatedAt: new Date().toISOString(),
  };
}

// ── AI enhancement (Claude/OpenAI), with graceful fallback ───────────────────
const SYSTEM = `You are Tactix Coach, a sharp, encouraging esports performance coach.
You are given a JSON snapshot of one player's recent stats across multiple games.
Return ONLY valid JSON of this exact shape:
{
  "headline": string,            // <= 6 words, punchy
  "insights": [                  // 3 to 4 items, most important first
    { "icon": string, "title": string, "body": string, "tone": "positive"|"warning"|"neutral" }
  ],
  "focus": string                // one concrete, actionable recommendation for this week
}
Rules:
- "icon" must be one of: flame, trophy, skull, bulb, shield, alert, clock, gauge, target, zap, star, activity.
- title <= 6 words; body <= 22 words, specific and grounded in the numbers provided.
- Never invent stats that aren't in the snapshot. If data is thin, say so plainly.
- Be direct and human; light competitive edge is good, but stay constructive.`;

export async function generateCoachReport(userId: string): Promise<CoachReport> {
  const snapshot = await buildCoachSnapshot(userId);
  const rules = buildRulesReport(snapshot);

  if (activeProvider() === "none") return rules;

  const ai = await completeJson<Omit<CoachReport, "source" | "generatedAt">>(
    SYSTEM,
    `Player snapshot:\n${JSON.stringify(snapshot, null, 2)}`,
    { maxTokens: 700 }
  );

  // Validate the AI output; fall back to deterministic rules if anything is off.
  if (
    ai &&
    typeof ai.headline === "string" &&
    typeof ai.focus === "string" &&
    Array.isArray(ai.insights) &&
    ai.insights.length >= 1 &&
    ai.insights.every(
      (i) => i && typeof i.title === "string" && typeof i.body === "string"
    )
  ) {
    return {
      headline: ai.headline,
      insights: ai.insights.slice(0, 4).map((i) => ({
        icon: typeof i.icon === "string" ? i.icon : "activity",
        title: i.title,
        body: i.body,
        tone: (["positive", "warning", "neutral"].includes(i.tone as string)
          ? i.tone
          : "neutral") as CoachTone,
      })),
      focus: ai.focus,
      source: "ai",
      generatedAt: new Date().toISOString(),
    };
  }

  return rules;
}
