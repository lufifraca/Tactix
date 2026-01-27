import { apiPost, steamLinkUrl } from "./api";

export { steamLinkUrl };

export async function linkMarvelRivals(username: string, platform = "pc") {
  return apiPost<{ displayName: string }>("/link/marvel", {
    username,
    platform,
    providerPreference: "TRACKER_NETWORK",
  });
}

export async function linkValorant(riotId: string, region = "americas") {
  return apiPost<{ displayName: string }>("/link/valorant", {
    riotId,
    region,
  });
}

export async function linkSupercell(game: string, tag: string) {
  return apiPost<{ displayName: string }>("/link/supercell", {
    game,
    tag,
  });
}

export async function linkCs2Extras(steamGameAuthCode: string, knownMatchCode?: string) {
  return apiPost("/link/cs2", {
    steamGameAuthCode,
    knownMatchCode: knownMatchCode || undefined,
  });
}
