import { apiPost, steamLinkUrl } from "./api";

export { steamLinkUrl };

export async function linkMarvelRivals(username: string, platform = "pc") {
  return apiPost<{ displayName: string }>("/link/marvel", {
    username,
    platform,
    providerPreference: "TRACKER_NETWORK",
  });
}

/** region omitted = auto-detect from the account (recommended). */
export async function linkValorant(riotId: string, region?: string) {
  return apiPost<{ displayName: string }>("/link/valorant", {
    riotId,
    ...(region ? { region } : {}),
  });
}

export async function linkSupercell(game: string, tag: string) {
  return apiPost<{ displayName: string }>("/link/supercell", {
    game,
    tag,
  });
}
