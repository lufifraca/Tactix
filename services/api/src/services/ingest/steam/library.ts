import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

export interface SteamOwnedGame {
    appid: number;
    name: string;
    playtime_forever: number;
    img_icon_url: string;
    playtime_windows_forever?: number;
    playtime_mac_forever?: number;
    playtime_linux_forever?: number;
    rtime_last_played?: number;
}

export interface SteamOwnedGamesResponse {
    response: {
        game_count: number;
        games: SteamOwnedGame[];
    };
}

export async function fetchSteamLibrary(steamId: string): Promise<SteamOwnedGame[]> {
    if (!env.STEAM_WEB_API_KEY) throw new Error("STEAM_WEB_API_KEY not configured");

    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${env.STEAM_WEB_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`;

    const data = await fetchWithRetries(() => fetchJson<SteamOwnedGamesResponse>(url));
    return data?.response?.games ?? [];
}
