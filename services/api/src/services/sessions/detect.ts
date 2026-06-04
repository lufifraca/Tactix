/**
 * Pure session-detection logic — no Prisma/IO, so it is unit-testable.
 * `sessionDetection.ts` wraps these with database reads/writes.
 */

// Session gap threshold: 30 minutes between matches = new session
export const SESSION_GAP_MINUTES = 30;
export const SESSION_GAP_MS = SESSION_GAP_MINUTES * 60 * 1000;

export interface MatchForSession {
  id: string;
  game: string;
  startedAt: Date | null;
  endedAt: Date | null;
  result: string;
  durationSeconds: number | null;
}

export interface DetectedSession {
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
 * Matches are grouped per-game, then split whenever the gap exceeds the threshold.
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
