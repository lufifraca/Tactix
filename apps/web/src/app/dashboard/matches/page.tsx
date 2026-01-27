"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet } from "@/lib/api";
import { gameColors, gameShortLabels } from "@/lib/gameTheme";

const resultStyles: Record<string, { text: string; bg: string }> = {
  WIN:  { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  LOSS: { text: "text-red-400",     bg: "bg-red-500/10" },
  DRAW: { text: "text-zinc-400",    bg: "bg-zinc-500/10" },
};

// ─── Types ───────────────────────────────────────────────────────
interface MatchEntry {
  id: string;
  game: string;
  matchId: string;
  mode: string;
  map: string | null;
  result: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  stats: Record<string, any>;
  source: string;
  accountName: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MatchesResponse {
  matches: MatchEntry[];
  pagination: Pagination;
}

// ─── Component ───────────────────────────────────────────────────
export default function MatchHistoryPage() {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [gameFilter, setGameFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const fetchMatches = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (gameFilter !== "ALL") params.set("game", gameFilter);
      if (modeFilter !== "ALL") params.set("mode", modeFilter);
      if (resultFilter !== "ALL") params.set("result", resultFilter);

      const data = await apiGet<MatchesResponse>(`/dashboard/matches?${params}`);
      setMatches(data.matches);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to load matches", err);
    } finally {
      setLoading(false);
    }
  }, [gameFilter, modeFilter, resultFilter]);

  useEffect(() => {
    fetchMatches(1);
  }, [fetchMatches]);

  function formatDuration(seconds: number | null) {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getStatLine(match: MatchEntry): string {
    const s = match.stats;
    if (!s) return "";

    if (match.game === "VALORANT" || match.game === "CS2" || match.game === "MARVEL_RIVALS") {
      const parts: string[] = [];
      if (s.kills != null) parts.push(`${s.kills}/${s.deaths ?? 0}/${s.assists ?? 0}`);
      if (s.damage != null) parts.push(`${s.damage} DMG`);
      if (s.agent) parts.push(s.agent);
      return parts.join(" · ");
    }
    if (match.game === "CLASH_ROYALE") {
      const parts: string[] = [];
      if (s.crowns != null) parts.push(`${s.crowns} crowns`);
      if (s.elixirLeaked != null) parts.push(`${s.elixirLeaked} leaked`);
      return parts.join(" · ");
    }
    if (match.game === "BRAWL_STARS") {
      const parts: string[] = [];
      if (s.trophyChange != null) parts.push(`${s.trophyChange > 0 ? "+" : ""}${s.trophyChange} trophies`);
      if (s.brawler) parts.push(s.brawler);
      return parts.join(" · ");
    }
    return "";
  }

  function getKda(stats: Record<string, any>): string | null {
    if (stats.kills == null || stats.deaths == null) return null;
    const kda = stats.deaths > 0
      ? ((stats.kills + (stats.assists || 0)) / stats.deaths).toFixed(2)
      : (stats.kills + (stats.assists || 0)).toFixed(2);
    return kda;
  }

  function getRoundScore(stats: Record<string, any>): string | null {
    if (stats.teamRoundsWon == null || stats.teamRoundsLost == null) return null;
    return `${stats.teamRoundsWon}–${stats.teamRoundsLost}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Match History
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pagination.total} matches tracked
          </p>
        </div>
      </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Game filter */}
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">All Games</option>
            <option value="VALORANT">Valorant</option>
            <option value="CS2">CS2</option>
            <option value="MARVEL_RIVALS">Marvel Rivals</option>
            <option value="CLASH_ROYALE">Clash Royale</option>
            <option value="BRAWL_STARS">Brawl Stars</option>
          </select>

          {/* Mode filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">All Modes</option>
            <option value="RANKED">Ranked</option>
            <option value="COMPETITIVE">Competitive</option>
            <option value="UNRANKED">Unrated</option>
            <option value="CASUAL">Casual</option>
            <option value="DEATHMATCH">Deathmatch</option>
          </select>

          {/* Result filter */}
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="ALL">All Results</option>
            <option value="WIN">Wins</option>
            <option value="LOSS">Losses</option>
            <option value="DRAW">Draws</option>
          </select>
        </div>

        {/* Match List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="text-lg font-semibold text-zinc-300 mb-2">No matches found</h2>
            <p className="text-sm text-zinc-500">
              {gameFilter !== "ALL" || resultFilter !== "ALL"
                ? "Try adjusting your filters."
                : "Link a game account and hit Refresh Stats on the dashboard to pull your matches."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {matches.map((match, i) => {
                const gc = gameColors[match.game] || { primary: "#71717a", bg: "bg-zinc-500/10", border: "border-zinc-500/30" };
                const rs = resultStyles[match.result] || resultStyles.DRAW;
                const expanded = expandedMatch === match.id;
                const kda = getKda(match.stats);
                const roundScore = getRoundScore(match.stats);

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setExpandedMatch(expanded ? null : match.id)}
                    className={`rounded-xl border ${gc.border} ${gc.bg} backdrop-blur-sm cursor-pointer transition-all hover:border-opacity-60`}
                  >
                    {/* Main row */}
                    <div className="flex items-center gap-4 px-4 py-3">
                      {/* Result indicator */}
                      <div className={`w-1.5 h-10 rounded-full ${
                        match.result === "WIN" ? "bg-emerald-500" :
                        match.result === "LOSS" ? "bg-red-500" :
                        "bg-zinc-500"
                      }`} />

                      {/* Game badge */}
                      <div className="w-20 shrink-0">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: `${gc.primary}20`, color: gc.primary }}
                        >
                          {gameShortLabels[match.game] || match.game}
                        </span>
                      </div>

                      {/* Result + Score */}
                      <div className="w-24 shrink-0">
                        <span className={`text-sm font-bold ${rs.text}`}>
                          {match.result}
                        </span>
                        {roundScore && (
                          <span className="text-xs text-zinc-500 ml-2">{roundScore}</span>
                        )}
                      </div>

                      {/* Stats line */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300 truncate">{getStatLine(match)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {match.map && (
                            <span className="text-xs text-zinc-500">{match.map}</span>
                          )}
                          {match.mode && match.mode !== "UNKNOWN" && (
                            <span className="text-xs text-zinc-600">· {match.mode}</span>
                          )}
                        </div>
                      </div>

                      {/* KDA badge */}
                      {kda && (
                        <div className="hidden sm:block shrink-0 text-right">
                          <span className={`text-sm font-mono font-semibold ${
                            parseFloat(kda) >= 2 ? "text-emerald-400" :
                            parseFloat(kda) >= 1 ? "text-zinc-300" :
                            "text-red-400"
                          }`}>
                            {kda} KDA
                          </span>
                        </div>
                      )}

                      {/* Duration + Time */}
                      <div className="shrink-0 text-right w-20">
                        <p className="text-xs text-zinc-400">{formatDate(match.endedAt)}</p>
                        {match.durationSeconds ? (
                          <p className="text-xs text-zinc-600">{formatDuration(match.durationSeconds)}</p>
                        ) : null}
                      </div>

                      {/* Expand arrow */}
                      <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        className="shrink-0"
                      >
                        <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                              {match.stats.kills != null && (
                                <StatBox label="Kills" value={match.stats.kills} />
                              )}
                              {match.stats.deaths != null && (
                                <StatBox label="Deaths" value={match.stats.deaths} />
                              )}
                              {match.stats.assists != null && (
                                <StatBox label="Assists" value={match.stats.assists} />
                              )}
                              {match.stats.score != null && (
                                <StatBox label="Score" value={match.stats.score.toLocaleString()} />
                              )}
                              {match.stats.headshots != null && (
                                <StatBox label="Headshots" value={match.stats.headshots} />
                              )}
                              {match.stats.damage != null && (
                                <StatBox label="Damage" value={match.stats.damage.toLocaleString()} />
                              )}
                              {match.stats.damageReceived != null && (
                                <StatBox label="DMG Taken" value={match.stats.damageReceived.toLocaleString()} />
                              )}
                              {match.stats.agent && (
                                <StatBox label="Agent" value={match.stats.agent} />
                              )}
                              {match.stats.competitiveTierPatched && (
                                <StatBox label="Rank" value={match.stats.competitiveTierPatched} />
                              )}
                              {match.stats.roundsPlayed != null && (
                                <StatBox label="Rounds" value={match.stats.roundsPlayed} />
                              )}
                              {match.stats.economySpent != null && (
                                <StatBox label="Eco Spent" value={`$${(match.stats.economySpent / 1000).toFixed(1)}k`} />
                              )}
                              {match.stats.crowns != null && (
                                <StatBox label="Crowns" value={match.stats.crowns} />
                              )}
                              {match.stats.trophyChange != null && (
                                <StatBox label="Trophies" value={`${match.stats.trophyChange > 0 ? "+" : ""}${match.stats.trophyChange}`} />
                              )}
                              {match.stats.brawler && (
                                <StatBox label="Brawler" value={match.stats.brawler} />
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
                              {match.accountName && <span>Account: {match.accountName}</span>}
                              <span>Source: {match.source}</span>
                              {match.startedAt && (
                                <span>{new Date(match.startedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={pagination.page <= 1}
              onClick={() => fetchMatches(pagination.page - 1)}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </motion.button>
            <span className="text-sm text-zinc-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchMatches(pagination.page + 1)}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </motion.button>
          </div>
        )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2">
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}
