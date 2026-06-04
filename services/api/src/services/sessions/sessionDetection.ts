import { prisma } from "../../prisma";
import {
  SESSION_GAP_MS,
  detectSessionsFromMatches,
  type DetectedSession,
} from "./detect";

// Re-export the pure detector so existing importers keep working.
export { detectSessionsFromMatches } from "./detect";

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
