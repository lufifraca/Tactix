import { env } from "../../../env";
import { fetchJson, fetchWithRetries } from "../../../utils/http";

/**
 * Tracker Network API format varies by title; this client is intentionally defensive.
 * If the endpoint isn't available to your key, it will throw and the caller should fall back.
 */
export async function fetchMarvelProfileTrackerNetwork(params: { platform: string; username: string }): Promise<any> {
  if (!env.TRN_API_KEY) throw new Error("TRN_API_KEY not configured");

  // Common TRN pattern:
  // https://public-api.tracker.gg/v2/<game>/standard/profile/<platform>/<username>
  const url = `https://public-api.tracker.gg/v2/marvel-rivals/standard/profile/${encodeURIComponent(params.platform)}/${encodeURIComponent(params.username)}`;

  return fetchWithRetries(() =>
    fetchJson<any>(url, {
      headers: {
        "TRN-Api-Key": env.TRN_API_KEY!,
      },
    })
  );
}
