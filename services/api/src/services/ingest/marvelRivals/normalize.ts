import { type MatchMode, type MatchResult } from "../../../constants";

function parseDurationSeconds(raw: any): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  if (typeof raw === "string") {
    // e.g. "8m 59s" or "15 minutes"
    const m = raw.match(/(\d+)\s*m/);
    const s = raw.match(/(\d+)\s*s/);
    const minutes = m ? parseInt(m[1], 10) : raw.includes("minute") ? parseInt(raw, 10) : 0;
    const seconds = s ? parseInt(s[1], 10) : 0;
    const total = minutes * 60 + seconds;
    return total > 0 ? total : null;
  }
  return null;
}

function inferMode(matchPlayer: any): MatchMode {
  // Heuristic: ranked matches tend to have MMR deltas (add_score) / level/score info.
  const si = matchPlayer?.score_info;
  if (si && (typeof si.add_score === "number" || typeof si.new_score === "number")) return "RANKED";
  return "UNRANKED";
}

function inferResult(matchPlayer: any): MatchResult {
  const isWin = matchPlayer?.is_win;
  const v = typeof isWin === "boolean" ? isWin : typeof isWin?.is_win === "boolean" ? isWin.is_win : null;
  if (v === true) return "WIN";
  if (v === false) return "LOSS";
  return "UNKNOWN";
}

export function normalizeMarvelMatchFromCommunity(match: any) {
  const mp = match.match_player ?? {};
  const hero = mp.player_hero ?? {};

  const endedAt = match.match_time_stamp ? new Date(match.match_time_stamp * 1000) : null;
  const duration = hero.play_time?.raw ?? match.match_play_duration;

  const normalizedStats = {
    kills: mp.kills ?? hero.kills ?? 0,
    deaths: mp.deaths ?? hero.deaths ?? 0,
    assists: mp.assists ?? hero.assists ?? 0,
    damageDealt: hero.total_hero_damage ?? 0,
    damageTaken: hero.total_damage_taken ?? 0,
    healingDone: hero.total_hero_heal ?? 0,
    matchDurationSeconds: parseDurationSeconds(duration) ?? undefined,
    score: mp.score_info?.score ?? mp.score_info?.new_score ?? undefined,
    extra: {
      heroId: hero.hero_id,
      heroName: hero.hero_name,
      gameModeId: match.game_mode_id,
      playModeId: match.play_mode_id,
      mapId: match.match_map_id,
      mapThumb: match.map_thumbnail,
    },
  };

  return {
    matchId: String(match.match_uid ?? match.matchId ?? ""),
    endedAt,
    startedAt: null as Date | null,
    durationSeconds: parseDurationSeconds(duration),
    mode: inferMode(mp),
    result: inferResult(mp),
    map: match.match_map_id ? `map_${match.match_map_id}` : null,
    normalizedStats,
  };
}
