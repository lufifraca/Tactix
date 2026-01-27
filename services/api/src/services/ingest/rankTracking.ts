import { prisma } from "../../prisma";
import type { GameAccount } from "@prisma/client";

export interface RankData {
  rankTier?: string | null;
  rankDivision?: string | null;
  rankNumeric?: number | null;
  percentile?: number | null;
  mode?: string | null;
  meta?: Record<string, any>;
}

export async function saveRankSnapshot(params: {
  userId: string;
  gameAccountId: string;
  game: string;
  source: string;
  rankData: RankData;
}) {
  const { userId, gameAccountId, game, source, rankData } = params;

  // Only save if we have meaningful rank data
  if (!rankData.rankTier && !rankData.rankNumeric) {
    return null;
  }

  return prisma.rankSnapshot.create({
    data: {
      userId,
      gameAccountId,
      game,
      mode: rankData.mode || null,
      rankTier: rankData.rankTier || null,
      rankDivision: rankData.rankDivision || null,
      rankNumeric: rankData.rankNumeric || null,
      percentile: rankData.percentile || null,
      source,
      meta: rankData.meta || undefined,
    },
  });
}

export async function getLatestRank(userId: string, game: string, mode?: string) {
  return prisma.rankSnapshot.findFirst({
    where: {
      userId,
      game,
      ...(mode ? { mode } : {}),
    },
    orderBy: { capturedAt: "desc" },
  });
}

export async function getRankHistory(userId: string, game: string, limit = 30) {
  return prisma.rankSnapshot.findMany({
    where: { userId, game },
    orderBy: { capturedAt: "desc" },
    take: limit,
  });
}
