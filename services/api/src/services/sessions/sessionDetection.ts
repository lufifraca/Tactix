import { prisma } from "../../prisma";

// Session gap threshold: 30 minutes between matches = new session
const SESSION_GAP_MINUTES = 30;
const SESSION_GAP_MS = SESSION_GAP_MINUTES * 60 * 1000;

interface MatchForSession {
  id: string;
  game: string;
  startedAt: Date | null;
  endedAt: Date | null;
  result: string;
  durationSeconds: number | null;
}

interface DetectedSession {
  game: string;
  startedAt: Date;
  endedAt: Date;
  matches: MatchForSession[];
  winCount: number;
  lossCount: number;
  drawCount: number;
  totalDuration: number;
  longestStreak: number;
  streakType: "WIN" | "LOSS" | null;
}

/**
 * Detects sessions from a list of matches.
 * A session is a continuous play period with gaps < 30 minutes between matches.
 */
export function detectSessionsFromMatches(matches: MatchForSession[]): DetectedSession[] {
  if (matches.length === 0) return [];

  // Sort by endedAt (or startedAt if endedAt is null)
  const sorted = [...matches].sort((a, b) => {
    const aTime = a.endedAt?.getTime() ?? a.startedAt?.getTime() ?? 0;
    const bTime = b.endedAt?.getTime() ?? b.startedAt?.getTime() ?? 0;
    return aTime - bTime;
  });

  // Group by game first
  const byGame = new Map<string, MatchForSession[]>();
  for (const match of sorted) {
    const existing = byGame.get(match.game) ?? [];
    existing.push(match);
    byGame.set(match.game, existing);
  }

  const sessions: DetectedSession[] = [];

  for (const [game, gameMatches] of byGame) {
    let currentSession: MatchForSession[] = [];
    let lastMatchEndTime: number | null = null;

    for (const match of gameMatches) {
      const matchTime = match.endedAt?.getTime() ?? match.startedAt?.getTime();
      if (!matchTime) continue;

      if (lastMatchEndTime !== null && matchTime - lastMatchEndTime > SESSION_GAP_MS) {
        // Gap too large, finalize current session
        if (currentSession.length > 0) {
          sessions.push(buildSession(game, currentSession));
        }
        currentSession = [];
      }

      currentSession.push(match);
      lastMatchEndTime = matchTime;
    }

    // Finalize last session
    if (currentSession.length > 0) {
      sessions.push(buildSession(game, currentSession));
    }
  }

  return sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

function buildSession(game: string, matches: MatchForSession[]): DetectedSession {
  const startedAt = matches[0].startedAt ?? matches[0].endedAt ?? new Date();
  const endedAt = matches[matches.length - 1].endedAt ?? matches[matches.length - 1].startedAt ?? new Date();

  let winCount = 0;
  let lossCount = 0;
  let drawCount = 0;
  let totalDuration = 0;

  // Track streaks
  let currentStreak = 0;
  let currentStreakType: "WIN" | "LOSS" | null = null;
  let longestStreak = 0;
  let longestStreakType: "WIN" | "LOSS" | null = null;

  for (const match of matches) {
    const result = match.result.toUpperCase();

    if (result === "WIN") {
      winCount++;
      if (currentStreakType === "WIN") {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentStreakType = "WIN";
      }
    } else if (result === "LOSS") {
      lossCount++;
      if (currentStreakType === "LOSS") {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentStreakType = "LOSS";
      }
    } else {
      drawCount++;
      // Draws reset the streak
      currentStreak = 0;
      currentStreakType = null;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
      longestStreakType = currentStreakType;
    }

    totalDuration += match.durationSeconds ?? 0;
  }

  return {
    game,
    startedAt,
    endedAt,
    matches,
    winCount,
    lossCount,
    drawCount,
    totalDuration,
    longestStreak,
    streakType: longestStreakType,
  };
}

/**
 * Detects and stores sessions for a user.
 * This is idempotent - it will only create sessions that don't already exist.
 */
export async function detectAndStoreSessions(userId: string, game?: string): Promise<number> {
  // Get all matches for the user (optionally filtered by game)
  const matches = await prisma.match.findMany({
    where: {
      userId,
      ...(game ? { game } : {}),
      // Only process matches with valid timestamps
      OR: [
        { endedAt: { not: null } },
        { startedAt: { not: null } },
      ],
    },
    orderBy: { endedAt: "asc" },
    select: {
      id: true,
      game: true,
      startedAt: true,
      endedAt: true,
      result: true,
      durationSeconds: true,
    },
  });

  const detectedSessions = detectSessionsFromMatches(matches);

  // Get existing sessions to avoid duplicates
  const existingSessions = await prisma.session.findMany({
    where: { userId, ...(game ? { game } : {}) },
    select: { startedAt: true, game: true },
  });

  const existingSessionKeys = new Set(
    existingSessions.map(s => `${s.game}-${s.startedAt.getTime()}`)
  );

  let createdCount = 0;

  for (const session of detectedSessions) {
    const key = `${session.game}-${session.startedAt.getTime()}`;
    if (!existingSessionKeys.has(key)) {
      await prisma.session.create({
        data: {
          userId,
          game: session.game,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          matchCount: session.matches.length,
          winCount: session.winCount,
          lossCount: session.lossCount,
          drawCount: session.drawCount,
          totalDuration: session.totalDuration,
          longestStreak: session.longestStreak,
          streakType: session.streakType,
        },
      });
      createdCount++;
    }
  }

  return createdCount;
}

/**
 * Gets the current session for a user (if they're in one).
 * A user is "in session" if their last match ended less than 30 minutes ago.
 */
export async function getCurrentSession(userId: string, game?: string): Promise<DetectedSession | null> {
  const recentMatches = await prisma.match.findMany({
    where: {
      userId,
      ...(game ? { game } : {}),
      endedAt: {
        gte: new Date(Date.now() - SESSION_GAP_MS),
      },
    },
    orderBy: { endedAt: "desc" },
    select: {
      id: true,
      game: true,
      startedAt: true,
      endedAt: true,
      result: true,
      durationSeconds: true,
    },
  });

  if (recentMatches.length === 0) return null;

  // Get all matches from the current session
  const mostRecentGame = recentMatches[0].game;
  const allRecentMatches = await prisma.match.findMany({
    where: {
      userId,
      game: mostRecentGame,
      endedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: { endedAt: "asc" },
    select: {
      id: true,
      game: true,
      startedAt: true,
      endedAt: true,
      result: true,
      durationSeconds: true,
    },
  });

  const sessions = detectSessionsFromMatches(allRecentMatches);

  // Return the most recent session (which includes the recent matches)
  if (sessions.length === 0) return null;

  const latestSession = sessions[sessions.length - 1];
  const latestMatchTime = latestSession.endedAt.getTime();

  // Check if this session is still "active" (within 30 min gap)
  if (Date.now() - latestMatchTime <= SESSION_GAP_MS) {
    return latestSession;
  }

  return null;
}

/**
 * Gets the current loss streak from recent matches.
 */
export async function getCurrentLossStreak(userId: string, game?: string): Promise<number> {
  const recentMatches = await prisma.match.findMany({
    where: {
      userId,
      ...(game ? { game } : {}),
    },
    orderBy: { endedAt: "desc" },
    take: 20,
    select: { result: true },
  });

  let streak = 0;
  for (const match of recentMatches) {
    if (match.result.toUpperCase() === "LOSS") {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
