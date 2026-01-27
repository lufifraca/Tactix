"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiGet, apiPost } from "@/lib/api";

// Game color theming and info
const gameConfig: Record<string, {
  name: string;
  color: string;
  gradient: string;
  glow: string;
  coverImage: string;
  icon: string;
}> = {
  CS2: {
    name: "Counter-Strike 2",
    color: "#f59e0b",
    gradient: "from-amber-600 via-orange-600 to-yellow-500",
    glow: "shadow-amber-500/30",
    coverImage: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/730/header.jpg",
    icon: "https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/730/69f7ebe2735c366c65c0b33dae00e12dc40edbe4.jpg",
  },
  MARVEL_RIVALS: {
    name: "Marvel Rivals",
    color: "#a855f7",
    gradient: "from-purple-600 via-violet-600 to-pink-500",
    glow: "shadow-purple-500/30",
    coverImage: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/2767030/header.jpg",
    icon: "/marvel-rivals-icon.png",
  },
  CLASH_ROYALE: {
    name: "Clash Royale",
    color: "#3b82f6",
    gradient: "from-blue-600 via-cyan-600 to-sky-500",
    glow: "shadow-blue-500/30",
    coverImage: "https://play-lh.googleusercontent.com/rIvZQ_H3hfmexC8vurmLczLtMNBFtxCg6JA8eMqk3k4FLHdLHTfQH1vqY4qSCFZCTQ=w526-h296-rw",
    icon: "https://play-lh.googleusercontent.com/1-1E5S0MkJfTq4n7HsXY5TN35X7YV1Y1_qmT56g5SjZBG_xSqf_CUB1RoR6d3S7r4f4=w240-h480-rw",
  },
  BRAWL_STARS: {
    name: "Brawl Stars",
    color: "#22c55e",
    gradient: "from-green-600 via-emerald-600 to-lime-500",
    glow: "shadow-green-500/30",
    coverImage: "https://play-lh.googleusercontent.com/GHqzO8JdLJ6KIDC8k3ZXWvjwEqhNlROsR2MmgJbDTt6YVuS0e6EZB7LdthKV7CiV8A=w526-h296-rw",
    icon: "https://play-lh.googleusercontent.com/GHqzO8JdLJ6KIDC8k3ZXWvjwEqhNlROsR2MmgJbDTt6YVuS0e6EZB7LdthKV7CiV8A=s180-rw",
  },
  VALORANT: {
    name: "Valorant",
    color: "#ff4655",
    gradient: "from-red-600 via-rose-600 to-pink-500",
    glow: "shadow-red-500/30",
    coverImage: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/438100/header.jpg",
    icon: "https://cdn.trackercdn.com/cdn/tracker.gg/valorant/icons/tiersv2/0.png",
  },
};

// Stat label formatting
const statLabels: Record<string, string> = {
  totalMatches: "Total Matches",
  wins: "Wins",
  losses: "Losses",
  winRate: "Win Rate",
  avgMatchDuration: "Avg Match Duration",
  totalKills: "Total Kills",
  totalDeaths: "Total Deaths",
  totalAssists: "Total Assists",
  totalHeadshots: "Headshots",
  totalMVPs: "MVPs",
  totalPlants: "Bomb Plants",
  totalDefuses: "Bomb Defuses",
  kd: "K/D Ratio",
  kda: "KDA Ratio",
  totalDamageDone: "Total Damage Done",
  totalDamageDealt: "Total Damage Dealt",
  totalHealingDone: "Total Healing",
  accuracy: "Accuracy",
  avgKills: "Avg Kills/Game",
  avgDeaths: "Avg Deaths/Game",
  avgAssists: "Avg Assists/Game",
  totalCrowns: "Total Crowns",
  avgCrowns: "Avg Crowns/Game",
  bestTrophies: "Best Trophies",
  expLevel: "Experience Level",
  arenaName: "Arena",
  highestTrophies: "Highest Trophies",
  soloVictories: "Solo Victories",
  duoVictories: "Duo Victories",
  trioVictories: "3v3 Victories",
  totalTrophyChange: "Trophy Change (Recent)",
};

interface LinkedGameItem {
  id: string;
  type: "linked_account";
  game: string;
  provider: string;
  displayName: string;
  externalId: string;
  linkedAt: string;
  rank: {
    tier: string | null;
    division: string | null;
    numeric: number | null;
    percentile: number | null;
  } | null;
  stats: Record<string, any>;
  firstMatchAt: string | null;
  lastMatchAt: string | null;
}

interface SteamLibraryItem {
  id: string;
  type: "steam_library";
  game: "STEAM";
  appId: number;
  name: string;
  playtimeMinutes: number;
  playtime2Weeks: number;
  iconUrl?: string;
  headerUrl: string;
  isFavorite: boolean;
  wantTracking: boolean;
}

interface LibraryResponse {
  linkedGames: LinkedGameItem[];
  steamLibrary: SteamLibraryItem[];
  totalGames: number;
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-10 w-48 bg-zinc-800/50 rounded-lg animate-pulse mb-8" />
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 bg-zinc-800/30 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function GameLibraryPage() {
  const [linkedGames, setLinkedGames] = useState<LinkedGameItem[]>([]);
  const [steamLibrary, setSteamLibrary] = useState<SteamLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadLibrary() {
    try {
      const res = await apiGet<LibraryResponse>("/me/library");
      setLinkedGames(res.linkedGames);
      setSteamLibrary(res.steamLibrary);
    } catch (err: any) {
      setError(err.message || "Failed to load library");
    }
  }

  useEffect(() => {
    async function load() {
      await loadLibrary();
      setLoading(false);
    }
    load();
  }, []);

  async function refreshSteamLibrary() {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await apiPost<{ ok: boolean; gamesFound: number; message?: string; error?: string }>(
        "/me/library/refresh-steam"
      );
      if (res.ok) {
        setRefreshMessage({ type: 'success', text: res.message || `Found ${res.gamesFound} games!` });
        await loadLibrary();
      } else {
        setRefreshMessage({ type: 'error', text: res.error || 'Failed to refresh Steam library' });
      }
    } catch (err: any) {
      setRefreshMessage({ type: 'error', text: err.message || 'Failed to refresh Steam library' });
    } finally {
      setRefreshing(false);
    }
  }

  async function togglePreference(game: SteamLibraryItem, field: 'isFavorite' | 'wantTracking') {
    const newValue = !game[field];
    // Optimistic update
    setSteamLibrary(prev => prev.map(g =>
      g.appId === game.appId ? { ...g, [field]: newValue } : g
    ).sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
      return b.playtimeMinutes - a.playtimeMinutes;
    }));

    try {
      await apiPost("/me/library/preferences", {
        steamAppId: game.appId,
        gameName: game.name,
        [field]: newValue,
      });
    } catch (err) {
      // Revert on error
      setSteamLibrary(prev => prev.map(g =>
        g.appId === game.appId ? { ...g, [field]: !newValue } : g
      ));
    }
  }

  const totalGames = linkedGames.length + steamLibrary.length;

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">Error</div>
          <div className="text-zinc-400 mb-6">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Game Library
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {totalGames} {totalGames === 1 ? 'game' : 'games'} total
            {linkedGames.length > 0 && steamLibrary.length > 0 && (
              <span className="text-zinc-600"> ({linkedGames.length} tracked, {steamLibrary.length} Steam)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={refreshSteamLibrary}
            disabled={refreshing}
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Steam
              </>
            )}
          </motion.button>
          <Link href="/dashboard/settings">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20"
            >
              Link More Games
            </motion.button>
          </Link>
        </div>
      </motion.header>

        {/* Refresh Message */}
        {refreshMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              refreshMessage.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">
                {refreshMessage.type === 'success' ? '✓' : '⚠'}
              </span>
              <div className="text-sm">{refreshMessage.text}</div>
            </div>
          </motion.div>
        )}

        {/* Game Cards */}
        {totalGames === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">No games linked yet</div>
            <p className="text-zinc-400 mb-6">
              Link your gaming accounts to start tracking your stats across all your favorite games.
            </p>
            <Link href="/dashboard/settings">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 text-white font-medium shadow-lg shadow-purple-500/20"
              >
                Link Your First Game
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Tracked Games Section */}
            {linkedGames.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-0.5 w-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" />
                  <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
                    Tracked Games ({linkedGames.length})
                  </h2>
                </div>
                <div className="space-y-6">
                  {linkedGames.map((game, index) => {
                    const config = gameConfig[game.game] || {
                      name: game.game,
                      color: "#888",
                      gradient: "from-zinc-600 to-zinc-500",
                      glow: "shadow-zinc-500/20",
                      coverImage: "",
                      icon: "",
                    };

                    // Filter out null/undefined stats and format them
                    const displayStats = Object.entries(game.stats).filter(
                      ([key, value]) => value !== null && value !== undefined && value !== 0
                    );

                    return (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className={`relative overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm hover:shadow-2xl hover:${config.glow} transition-all duration-300`}
                      >
                        {/* Cover Image Background */}
                        <div className="absolute inset-0 z-0">
                          {config.coverImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={config.coverImage}
                              alt=""
                              className="w-full h-full object-cover opacity-20"
                            />
                          )}
                          <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-10`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                        </div>

                        <div className="relative z-10 p-6">
                          {/* Game Header */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div
                                className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg"
                                style={{
                                  background: `linear-gradient(135deg, ${config.color}40, ${config.color}20)`,
                                  border: `1px solid ${config.color}40`,
                                }}
                              >
                                {config.icon ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={config.icon}
                                    alt={config.name}
                                    className="w-12 h-12 rounded-lg"
                                  />
                                ) : (
                                  <span className="text-2xl font-bold" style={{ color: config.color }}>
                                    {config.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h2
                                  className="text-2xl font-bold"
                                  style={{ color: config.color }}
                                >
                                  {config.name}
                                </h2>
                                <p className="text-sm text-zinc-500">
                                  {game.displayName} {game.provider !== "DEBUG" && `· ${game.provider}`}
                                </p>
                              </div>
                            </div>

                            {/* Rank Badge */}
                            {game.rank && (game.rank.tier || game.rank.numeric) && (
                              <div
                                className="px-4 py-2 rounded-xl text-center"
                                style={{
                                  background: `linear-gradient(135deg, ${config.color}30, ${config.color}10)`,
                                  border: `1px solid ${config.color}30`,
                                }}
                              >
                                {game.rank.tier && (
                                  <div className="text-sm font-semibold text-white">
                                    {game.rank.tier}
                                    {game.rank.division && ` ${game.rank.division}`}
                                  </div>
                                )}
                                {game.rank.numeric && (
                                  <div
                                    className="text-xl font-bold"
                                    style={{ color: config.color }}
                                  >
                                    {game.rank.numeric.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {displayStats.map(([key, value]) => (
                              <motion.div
                                key={key}
                                whileHover={{ scale: 1.02 }}
                                className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors"
                              >
                                <div className="text-xs text-zinc-500 uppercase tracking-wider">
                                  {statLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                </div>
                                <div className="mt-1 text-lg font-semibold text-white">
                                  {key === 'winRate' || key === 'accuracy' ? `${value}%` :
                                   key === 'avgMatchDuration' ? `${value}m` :
                                   typeof value === 'number' ? value.toLocaleString() :
                                   value}
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Footer Info */}
                          <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
                            <div className="flex items-center gap-4">
                              {game.firstMatchAt && (
                                <span>
                                  First match: {new Date(game.firstMatchAt).toLocaleDateString()}
                                </span>
                              )}
                              {game.lastMatchAt && (
                                <span>
                                  Last played: {new Date(game.lastMatchAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <span>
                              Linked: {new Date(game.linkedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Steam Library Section */}
            {steamLibrary.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-0.5 w-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
                  <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
                    Steam Library ({steamLibrary.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {steamLibrary.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: linkedGames.length * 0.1 + index * 0.03 }}
                      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
                      className={`relative overflow-hidden rounded-xl border bg-zinc-900/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 ${
                        game.isFavorite
                          ? 'border-amber-500/50 hover:shadow-amber-500/10'
                          : 'border-zinc-800/50 hover:shadow-blue-500/10'
                      }`}
                    >
                      {/* Header Image Background */}
                      <div className="relative h-32 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={game.headerUrl}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />

                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); togglePreference(game, 'isFavorite'); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              game.isFavorite
                                ? 'bg-amber-500/90 text-white'
                                : 'bg-zinc-900/70 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/90'
                            }`}
                            title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg className="w-4 h-4" fill={game.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); togglePreference(game, 'wantTracking'); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              game.wantTracking
                                ? 'bg-purple-500/90 text-white'
                                : 'bg-zinc-900/70 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800/90'
                            }`}
                            title={game.wantTracking ? 'Remove tracking request' : 'Request stat tracking'}
                          >
                            <svg className="w-4 h-4" fill={game.wantTracking ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </motion.button>
                        </div>

                        {/* Favorite Badge */}
                        {game.isFavorite && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-xs font-medium text-white">
                            Favorite
                          </div>
                        )}
                      </div>

                      <div className="relative p-4 -mt-8">
                        <div className="flex items-start gap-3">
                          {game.iconUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={game.iconUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg shadow-lg bg-zinc-800"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white truncate" title={game.name}>
                              {game.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm">
                              <span className="text-zinc-400">
                                {Math.round(game.playtimeMinutes / 60)}h total
                              </span>
                              {game.playtime2Weeks > 0 && (
                                <span className="text-blue-400">
                                  {(game.playtime2Weeks / 60).toFixed(1)}h recent
                                </span>
                              )}
                            </div>
                            {game.wantTracking && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Tracking requested
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 pt-6 border-t border-zinc-800/50 text-center text-sm text-zinc-600"
        >
          <p>Stats shown are pulled directly from game APIs and may vary in availability per game.</p>
        </motion.footer>
    </div>
  );
}
