import type { GameAccount } from "@prisma/client";
import { prisma } from "../../../prisma";
import { putObject } from "../../storage";
import { sha256Hex } from "../../../utils/crypto";
import { fetchCs2CumulativeStats, mapCs2CumulativeToCanonical, statsArrayToMap, diffCanonical } from "./steamStats";

export async function ingestCs2Account(account: GameAccount): Promise<{ inserted: number; snapshotId: string }> {
  const steamid = account.externalId;

  // Note: CS2 competitive rank is not available via Steam Web API.
  // Rank tracking requires either:
  // 1. Match share codes + Game Coordinator API
  // 2. Third-party rank tracking services
  // 3. Steam profile scraping (if public)
  // TODO: Implement rank extraction when share code system is added

  const payload = await fetchCs2CumulativeStats(steamid);
  const rawJson = JSON.stringify(payload);

  const rawKey = `raw/cs2/steam/${account.userId}/${Date.now()}_${sha256Hex(rawJson).slice(0, 10)}.json`;
  await putObject({ key: rawKey, body: rawJson, contentType: "application/json", cacheControl: "private, max-age=0" });

  const cumMap = statsArrayToMap(payload.playerstats?.stats);
  const canonicalCum = mapCs2CumulativeToCanonical(cumMap);

  // Store snapshot (cumulative)
  const snapshot = await prisma.statSnapshot.create({
    data: {
      userId: account.userId,
      gameAccountId: account.id,
      game: "CS2",
      mode: "UNKNOWN",
      stats: { cumulative: canonicalCum, rawNames: Object.keys(cumMap).length },
      source: "STEAM",
    },
  });

  // Compute delta since previous snapshot and store as a synthetic "match-like" record.
  const prev = await prisma.statSnapshot.findFirst({
    where: { gameAccountId: account.id, id: { not: snapshot.id } },
    orderBy: { capturedAt: "desc" },
  });

  const prevCum = (prev?.stats as any)?.cumulative ?? null;
  const delta = prevCum ? diffCanonical(canonicalCum, prevCum) : { ...canonicalCum, extra: { note: "first_snapshot" } };

  const meaningful =
    (delta.kills ?? 0) + (delta.deaths ?? 0) + (delta.assists ?? 0) + (delta.headshots ?? 0) + (delta.plants ?? 0) + (delta.defuses ?? 0) > 0;

  let inserted = 0;
  if (meaningful) {
    const matchId = `cs2_delta_${snapshot.capturedAt.getTime()}_${snapshot.id.slice(-8)}`;
    await prisma.match.create({
      data: {
        userId: account.userId,
        gameAccountId: account.id,
        game: "CS2",
        matchId,
        startedAt: null,
        endedAt: snapshot.capturedAt,
        mode: "UNKNOWN",
        result: "UNKNOWN",
        normalizedStats: delta as any,
        rawPayloadS3Key: rawKey,
        rawPayloadSha256: sha256Hex(rawJson),
        source: "STEAM",
      },
    });
    inserted = 1;
  }

  return { inserted, snapshotId: snapshot.id };
}
