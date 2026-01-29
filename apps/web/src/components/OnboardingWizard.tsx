"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { linkMarvelRivals, linkValorant, linkSupercell, steamLinkUrl } from "@/lib/linking";
import { apiPost } from "@/lib/api";

type Step = "welcome" | "link" | "syncing" | "done";

const GAMES = [
  {
    key: "STEAM",
    label: "Steam Library",
    color: "#1b2838",
    type: "steam" as const,
    desc: "Import your Steam games",
  },
  {
    key: "MARVEL_RIVALS",
    label: "Marvel Rivals",
    color: "#a855f7",
    type: "username" as const,
    desc: "Enter your username",
    placeholder: "Username",
  },
  {
    key: "VALORANT",
    label: "Valorant",
    color: "#ff4655",
    type: "riotId" as const,
    desc: "Enter your Riot ID",
    placeholder: "Name#Tag",
  },
  {
    key: "CLASH_ROYALE",
    label: "Clash Royale",
    color: "#3b82f6",
    type: "tag" as const,
    desc: "Enter your Player Tag",
    placeholder: "#ABC123",
  },
  {
    key: "BRAWL_STARS",
    label: "Brawl Stars",
    color: "#22c55e",
    type: "tag" as const,
    desc: "Enter your Player Tag",
    placeholder: "#ABC123",
  },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);

  async function handleLink() {
    if (!selectedGame || !inputValue.trim()) return;
    setLinking(true);
    setError(null);

    try {
      if (selectedGame === "MARVEL_RIVALS") {
        await linkMarvelRivals(inputValue.trim());
      } else if (selectedGame === "VALORANT") {
        if (!inputValue.includes("#")) {
          setError("Riot ID must include # (e.g., Player#NA1)");
          setLinking(false);
          return;
        }
        await linkValorant(inputValue.trim());
      } else if (selectedGame === "CLASH_ROYALE" || selectedGame === "BRAWL_STARS") {
        await linkSupercell(selectedGame, inputValue.trim());
      }
      setLinked(true);
      // Auto-advance to syncing
      setTimeout(() => setStep("syncing"), 800);
    } catch (e: any) {
      setError(e.message || "Failed to link account");
    } finally {
      setLinking(false);
    }
  }

  async function handleSync() {
    try {
      await apiPost("/ingest/refresh");
    } catch {
      // Ignore — refresh may not find matches yet
    }
    setStep("done");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg text-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-8"
            >
              <span className="text-4xl font-bold text-white">T</span>
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-4">
              Welcome to Tactix
            </h1>
            <p className="text-zinc-400 text-lg mb-2">
              Your cross-game coaching platform.
            </p>
            <p className="text-zinc-500 mb-10">
              Track your stats, get daily quests, and improve across all your games.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("link")}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
            >
              Get Started
            </motion.button>
          </motion.div>
        )}

        {step === "link" && (
          <motion.div
            key="link"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl w-full"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Link your first game
            </h2>
            <p className="text-zinc-500 text-center mb-8">
              Choose a game to start tracking your stats.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {GAMES.map((game, i) => (
                <motion.button
                  key={game.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (game.type === "steam") {
                      window.location.href = steamLinkUrl();
                      return;
                    }
                    setSelectedGame(selectedGame === game.key ? null : game.key);
                    setInputValue("");
                    setError(null);
                    setLinked(false);
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedGame === game.key
                      ? "border-opacity-80 bg-opacity-20"
                      : "border-zinc-800/50 bg-zinc-900/50 hover:bg-zinc-800/50"
                  }`}
                  style={{
                    borderColor: selectedGame === game.key ? `${game.color}60` : undefined,
                    backgroundColor: selectedGame === game.key ? `${game.color}10` : undefined,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
                    style={{ backgroundColor: `${game.color}25`, color: game.color }}
                  >
                    {game.label.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white">{game.label}</div>
                    <div className="text-xs text-zinc-500">{game.desc}</div>
                  </div>
                  {game.type === "steam" && (
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Linking form */}
            <AnimatePresence>
              {selectedGame && !linked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-5">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLink()}
                        placeholder={GAMES.find((g) => g.key === selectedGame)?.placeholder || ""}
                        className="flex-1 min-w-0 rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
                        autoFocus
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLink}
                        disabled={linking || !inputValue.trim()}
                        className="px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {linking ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          "Link"
                        )}
                      </motion.button>
                    </div>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-sm text-red-400"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success state */}
            <AnimatePresence>
              {linked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center"
                >
                  <div className="text-green-400 font-medium mb-1">Account linked!</div>
                  <p className="text-sm text-zinc-500">Syncing your stats...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skip link */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setStep("done");
                }}
                className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {step === "syncing" && (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-md text-center"
            onAnimationComplete={() => handleSync()}
          >
            <div className="w-16 h-16 mx-auto mb-6 border-3 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">Pulling your stats</h2>
            <p className="text-zinc-500">
              This may take a moment. We&apos;re fetching your match history and computing your skill scores.
            </p>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-md text-center"
            onAnimationComplete={() => {
              setTimeout(onComplete, 600);
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">You&apos;re all set!</h2>
            <p className="text-zinc-500">Loading your dashboard...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
