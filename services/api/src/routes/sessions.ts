import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import {
  getSessionInsights,
  getFullSessionInsights,
  detectAndStoreSessions,
  getCurrentSession,
} from "../services/sessions";

export async function sessionRoutes(app: FastifyInstance) {
  /**
   * GET /session-insights/:userId
   * Returns comprehensive session intelligence data for a user.
   * Query params:
   * - game: optional filter by game
   * - refresh: if "true", forces a refresh of computed analytics
   */
  app.get("/:userId", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const { userId } = req.params as { userId: string };

    // Users can only view their own session insights
    if (user.id !== userId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    const Query = z.object({
      game: z.string().optional(),
      refresh: z.enum(["true", "false"]).optional().default("false"),
    });
    const { game, refresh } = Query.parse(req.query);

    if (game) {
      // Return insights for specific game
      const insights = await getSessionInsights(userId, game, refresh === "true");
      return { insights, game };
    }

    // Return full insights (overall + per game)
    const fullInsights = await getFullSessionInsights(userId);
    return fullInsights;
  });

  /**
   * GET /session-insights/:userId/current
   * Returns the current active session if the user is in one.
   */
  app.get("/:userId/current", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const { userId } = req.params as { userId: string };

    if (user.id !== userId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    const Query = z.object({
      game: z.string().optional(),
    });
    const { game } = Query.parse(req.query);

    const currentSession = await getCurrentSession(userId, game);

    if (!currentSession) {
      return { inSession: false, session: null };
    }

    return {
      inSession: true,
      session: {
        game: currentSession.game,
        startedAt: currentSession.startedAt.toISOString(),
        endedAt: currentSession.endedAt.toISOString(),
        matchCount: currentSession.matches.length,
        winCount: currentSession.winCount,
        lossCount: currentSession.lossCount,
        drawCount: currentSession.drawCount,
        winRate: currentSession.matches.length > 0
          ? currentSession.winCount / currentSession.matches.length
          : 0,
        totalDurationMinutes: Math.round(currentSession.totalDuration / 60),
        longestStreak: currentSession.longestStreak,
        streakType: currentSession.streakType,
      },
    };
  });

  /**
   * POST /session-insights/:userId/refresh
   * Forces a refresh of session detection and analytics.
   */
  app.post("/:userId/refresh", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const { userId } = req.params as { userId: string };

    if (user.id !== userId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    const Body = z.object({
      game: z.string().optional(),
    });
    const { game } = Body.parse((req as any).body ?? {});

    // Detect and store new sessions
    const newSessionsCount = await detectAndStoreSessions(userId, game);

    // Get fresh insights
    const insights = await getSessionInsights(userId, game ?? null, true);

    return {
      ok: true,
      newSessionsDetected: newSessionsCount,
      insights,
    };
  });

  /**
   * GET /session-insights/:userId/tilt-status
   * Quick endpoint to check current tilt status and get alerts.
   */
  app.get("/:userId/tilt-status", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const { userId } = req.params as { userId: string };

    if (user.id !== userId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    const Query = z.object({
      game: z.string().optional(),
    });
    const { game } = Query.parse(req.query);

    const insights = await getSessionInsights(userId, game ?? null);

    return {
      isTilting: insights.tilt.isTilting,
      currentLossStreak: insights.tilt.currentLossStreak,
      tiltThreshold: insights.tilt.tiltThreshold,
      alert: insights.tiltAlert,
    };
  });

  /**
   * GET /session-insights/:userId/performance-summary
   * Returns a condensed summary of best/worst times to play.
   */
  app.get("/:userId/performance-summary", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const { userId } = req.params as { userId: string };

    if (user.id !== userId) {
      const err: any = new Error("Forbidden");
      err.statusCode = 403;
      throw err;
    }

    const Query = z.object({
      game: z.string().optional(),
    });
    const { game } = Query.parse(req.query);

    const insights = await getSessionInsights(userId, game ?? null);

    return {
      bestTimeOfDay: insights.timeOfDay.bestTime,
      worstTimeOfDay: insights.timeOfDay.worstTime,
      bestDayOfWeek: insights.dayOfWeek.bestDay,
      worstDayOfWeek: insights.dayOfWeek.worstDay,
      optimalSessionLength: insights.sessionLength.optimalLength,
      optimalGameCount: insights.optimalSession.optimalGameCount,
      tiltThreshold: insights.tilt.tiltThreshold,
      totalMatchesAnalyzed: insights.totalMatchesAnalyzed,
      recommendations: generateRecommendations(insights),
    };
  });
}

function generateRecommendations(insights: any): string[] {
  const recommendations: string[] = [];

  // Time of day recommendation
  if (insights.timeOfDay.bestTime) {
    const timeLabels: Record<string, string> = {
      morning: "in the morning (6AM-12PM)",
      afternoon: "in the afternoon (12PM-6PM)",
      evening: "in the evening (6PM-12AM)",
      night: "at night (12AM-6AM)",
    };
    recommendations.push(`You perform best ${timeLabels[insights.timeOfDay.bestTime]}.`);
  }

  // Day of week recommendation
  if (insights.dayOfWeek.bestDay) {
    const dayLabel = insights.dayOfWeek.bestDay.charAt(0).toUpperCase() + insights.dayOfWeek.bestDay.slice(1);
    recommendations.push(`${dayLabel} is your strongest day of the week.`);
  }

  // Session length recommendation
  if (insights.sessionLength.optimalLength) {
    const lengthLabels: Record<string, string> = {
      short: "Keep sessions to 1-3 games for best performance.",
      medium: "Aim for 4-7 games per session for optimal results.",
      long: "You maintain performance well in longer sessions (8+ games).",
    };
    recommendations.push(lengthLabels[insights.sessionLength.optimalLength]);
  }

  // Tilt threshold recommendation
  if (insights.tilt.tiltThreshold !== null) {
    recommendations.push(
      `Consider taking a break after ${insights.tilt.tiltThreshold} consecutive loss${
        insights.tilt.tiltThreshold === 1 ? "" : "es"
      }.`
    );
  }

  // Optimal session recommendation
  if (insights.optimalSession.declinePoint) {
    recommendations.push(
      `Your performance typically declines after game ${insights.optimalSession.declinePoint} in a session.`
    );
  }

  return recommendations;
}
