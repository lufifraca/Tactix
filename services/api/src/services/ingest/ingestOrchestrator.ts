import { prisma } from "../../prisma";
import { ingestCs2Account } from "./cs2/index.js";
import { ingestMarvelRivalsAccount } from "./marvelRivals/index.js";

export async function ingestGameAccount(gameAccountId: string) {
  const account = await prisma.gameAccount.findUnique({ where: { id: gameAccountId } });
  if (!account) return { ok: false, error: "Account not found" };

  // Generic Provider Handling
  if (account.provider === "STEAM" && account.externalId) {
    try {
      // Prototype: Ingest Library for every Steam account touch
      // In production, this should be a separate job or rate-limited.
      const { fetchSteamLibrary } = await import("./steam/library");
      const { putObject } = await import("../storage");

      const games = await fetchSteamLibrary(account.externalId);
      const body = JSON.stringify({ games, date: new Date().toISOString() });
      const key = `raw/steam_library/${account.userId}/${Date.now()}.json`;

      await putObject({ key, body, contentType: "application/json", cacheControl: "private, max-age=0" });

      // Also cache in Redis (fallback when S3 is not configured)
      try {
        const { redis } = await import("../../queue");
        if (redis) {
          await redis.set(`steam_library:${account.userId}`, body, "EX", 86400 * 7);
        }
      } catch (_) { /* non-fatal */ }

      console.log(`Ingested Steam Lib for ${account.userId}: ${games.length} games`);

      // TODO: In Phase 3, we will sync these to a Game/GameAccount table.
    } catch (e) {
      console.error("Failed to ingest Steam library", e);
      // Don't fail the specific game ingest just because library failed
    }
  }

  if (account.game === "CS2") {
    const res = await ingestCs2Account(account);
    return { ok: true, inserted: res.inserted, game: "CS2" };
  }

  if (account.game === "MARVEL_RIVALS") {
    const res = await ingestMarvelRivalsAccount(account);
    return { ok: true, inserted: res.inserted, game: "MARVEL_RIVALS", sourceUsed: res.sourceUsed };
  }

  if ((account.provider as any) === "SUPERCELL") {
    const { ingestSupercellAccount } = await import("./supercell/ingest");
    const res = await ingestSupercellAccount(account);
    return { ok: true, inserted: res.inserted, game: account.game };
  }

  if (account.game === "VALORANT") {
    const { ingestValorantAccount } = await import("./valorant/ingest");
    const res = await ingestValorantAccount(account);
    return {
      ok: true,
      inserted: res.inserted,
      game: "VALORANT",
      note: res.matchHistoryError || undefined,
    };
  }

  return { ok: false, error: "Unsupported game" };
}

export async function ingestUserAll(userId: string) {
  const accounts = await prisma.gameAccount.findMany({ where: { userId } });
  console.log(`[Ingest] Found ${accounts.length} accounts for user ${userId}:`, accounts.map(a => `${a.game}/${a.provider}/${a.displayName}`));
  const results = [];
  for (const a of accounts) {
    try {
      results.push(await ingestGameAccount(a.id));
    } catch (err: any) {
      console.error(`[Ingest] Error ingesting account ${a.id} (${a.game}):`, err.message);
      results.push({ ok: false, error: err.message, game: a.game });
    }
  }
  return { ok: true, results };
}
