import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

// Supercell APIs generally use Bearer token auth derived from IP allowlists.
// Users must generate a token from developer.clashroyale.com or developer.brawlstars.com

export async function fetchClashRoyalePlayer(tag: string) {
    if (!env.CLASH_ROYALE_API_TOKEN) throw new Error("CLASH_ROYALE_API_TOKEN not configured");

    const cleanTag = tag.replace("#", "");
    const url = `https://api.clashroyale.com/v1/players/%23${cleanTag}`;

    return fetchWithRetries(() =>
        fetchJson<any>(url, {
            headers: {
                Authorization: `Bearer ${env.CLASH_ROYALE_API_TOKEN}`,
            },
        })
    );
}

export async function fetchBrawlStarsPlayer(tag: string) {
    if (!env.BRAWL_STARS_API_TOKEN) throw new Error("BRAWL_STARS_API_TOKEN not configured");

    const cleanTag = tag.replace("#", "");
    const url = `https://api.brawlstars.com/v1/players/%23${cleanTag}`;

    return fetchWithRetries(() =>
        fetchJson<any>(url, {
            headers: {
                Authorization: `Bearer ${env.BRAWL_STARS_API_TOKEN}`,
            },
        })
    );
}

export async function fetchClashRoyaleBattleLog(tag: string) {
    if (!env.CLASH_ROYALE_API_TOKEN) throw new Error("CLASH_ROYALE_API_TOKEN not configured");

    const cleanTag = tag.replace("#", "");
    const url = `https://api.clashroyale.com/v1/players/%23${cleanTag}/battlelog`;

    return fetchWithRetries(() =>
        fetchJson<any[]>(url, {
            headers: { Authorization: `Bearer ${env.CLASH_ROYALE_API_TOKEN}` },
        })
    );
}

export async function fetchBrawlStarsBattleLog(tag: string) {
    if (!env.BRAWL_STARS_API_TOKEN) throw new Error("BRAWL_STARS_API_TOKEN not configured");

    const cleanTag = tag.replace("#", "");
    const url = `https://api.brawlstars.com/v1/players/%23${cleanTag}/battlelog`;

    return fetchWithRetries(() =>
        fetchJson<any>(url, { // BS returns { items: [] }
            headers: { Authorization: `Bearer ${env.BRAWL_STARS_API_TOKEN}` },
        })
    );
}
