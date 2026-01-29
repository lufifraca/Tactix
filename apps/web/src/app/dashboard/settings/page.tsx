"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiGet, apiPost, steamLinkUrl } from "@/lib/api";
import { gameColors, gameLabels } from "@/lib/gameTheme";
import { AnimatedCard } from "@/components/AnimatedCard";

type LinkedAccount = {
  id: string;
  game: "CS2" | "MARVEL_RIVALS" | "CLASH_ROYALE" | "BRAWL_STARS" | "VALORANT";
  provider: string;
  externalId: string;
  displayName: string;
  platform?: string | null;
  linkedAt: string;
  meta?: any;
};

function SettingsSectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xl">{icon}</span>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

export default function SettingsPage() {
  const [me, setMe] = useState<any>(null);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [mrUser, setMrUser] = useState("");
  const [mrPlatform, setMrPlatform] = useState("pc");
  const [scGame, setScGame] = useState("CLASH_ROYALE");
  const [scTag, setScTag] = useState("");
  const [valRiotId, setValRiotId] = useState("");
  const [valRegion, setValRegion] = useState("americas");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const m = await apiGet("/me");
      setMe(m);
      const linked = await apiGet<{ accounts: LinkedAccount[] }>("/me/linked");
      setAccounts(linked.accounts);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("401") || msg.includes("Unauthorized")) {
        window.location.href = "/login";
        return;
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showMessage(text: string, type: "success" | "error" = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function linkMarvel() {
    if (!mrUser.trim()) {
      showMessage("Please enter a username", "error");
      return;
    }
    try {
      await apiPost("/link/marvel", { username: mrUser, platform: mrPlatform, providerPreference: "TRACKER_NETWORK" });
      showMessage("Marvel Rivals linked successfully!", "success");
      setMrUser("");
      await load();
    } catch (e: any) {
      showMessage(e.message || "Failed to link", "error");
    }
  }

  async function linkSupercell() {
    if (!scTag.trim()) {
      showMessage("Please enter a player tag", "error");
      return;
    }
    try {
      const res = await apiPost<{ displayName: string }>("/link/supercell", { game: scGame, tag: scTag });
      showMessage(`Linked ${gameLabels[scGame]}: ${res.displayName}`, "success");
      setScTag("");
      await load();
    } catch (e: any) {
      showMessage(e.message || "Failed to link", "error");
    }
  }

  async function linkValorant() {
    if (!valRiotId.trim()) {
      showMessage("Please enter your Riot ID (Name#Tag)", "error");
      return;
    }
    if (!valRiotId.includes("#")) {
      showMessage("Riot ID must include # (e.g., Player#NA1)", "error");
      return;
    }
    try {
      const res = await apiPost<{ displayName: string }>("/link/valorant", { riotId: valRiotId, region: valRegion });
      showMessage(`Linked Valorant: ${res.displayName}`, "success");
      setValRiotId("");
      await load();
    } catch (e: any) {
      showMessage(e.message || "Failed to link", "error");
    }
  }

  async function unlinkAccount(account: LinkedAccount) {
    if (!confirm(`Disconnect ${gameLabels[account.game] || account.game}?`)) return;
    try {
      await apiPost("/link/unlink", { accountId: account.id });
      showMessage("Account unlinked", "success");
      await load();
    } catch (e: any) {
      showMessage(e.message || "Failed to unlink", "error");
    }
  }

  async function upgrade() {
    // Use external payment link if configured, otherwise use API checkout
    const externalPaymentUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_URL;
    if (externalPaymentUrl) {
      window.location.href = externalPaymentUrl;
      return;
    }
    try {
      const r = await apiPost<{ url: string }>("/billing/checkout");
      if (r.url) {
        window.location.href = r.url;
      } else {
        showMessage("Billing not configured. Please contact support.", "error");
      }
    } catch (e: any) {
      showMessage(e.message || "Failed to start checkout", "error");
    }
  }

  async function manageBilling() {
    const r = await apiPost<{ url: string }>("/billing/portal");
    window.location.href = r.url;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-zinc-800 rounded-lg" />
          <div className="h-32 bg-zinc-800/50 rounded-xl" />
          <div className="h-48 bg-zinc-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account and linked games</p>
      </motion.div>

      {/* Message Toast */}
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`mb-6 p-4 rounded-xl border ${
            msg.type === "success"
              ? "bg-green-950/30 border-green-500/30 text-green-400"
              : "bg-red-950/30 border-red-500/30 text-red-400"
          }`}
        >
          {msg.text}
        </motion.div>
      )}

      {/* Subscription */}
      <AnimatedCard delay={0.1} className="p-6 mb-6">
        <SettingsSectionHeader title="Subscription" icon="💎" />
        <div className="flex items-center justify-between">
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              me?.subscriptionActive
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}>
              {me?.subscriptionActive ? "Pro Plan" : "Free Plan"}
            </div>
            <p className="text-sm text-zinc-500 mt-2">
              {me?.subscriptionActive ? "3 daily quests, priority features" : "1 daily quest"}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={me?.subscriptionActive ? manageBilling : upgrade}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              me?.subscriptionActive
                ? "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/20"
            }`}
          >
            {me?.subscriptionActive ? "Manage Billing" : "Upgrade to Pro ($4.99/mo)"}
          </motion.button>
        </div>
      </AnimatedCard>

      {/* Linked Accounts */}
      <AnimatedCard delay={0.15} className="p-6 mb-6">
        <SettingsSectionHeader title="Linked Accounts" icon="🔗" />
        {accounts.length === 0 ? (
          <p className="text-zinc-500">No accounts linked yet. Link a game below to start tracking!</p>
        ) : (
          <div className="space-y-3">
            {accounts.map((a, i) => {
              const colors = gameColors[a.game] || gameColors.CS2;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-xl border border-zinc-800/50 bg-gradient-to-r ${colors.gradient}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: `${colors.primary}30`, color: colors.primary }}
                    >
                      {(gameLabels[a.game] || a.game).charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-white">{gameLabels[a.game] || a.game}</div>
                      <div className="text-sm text-zinc-400">{a.displayName}</div>
                      <div className="text-xs text-zinc-600">{a.provider} · {a.externalId}</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => unlinkAccount(a)}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-950/30 transition-colors"
                  >
                    Unlink
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatedCard>

      {/* Link Steam */}
      {!accounts.some(a => a.provider === "STEAM") && (
        <AnimatedCard delay={0.2} className="p-6 mb-6">
          <SettingsSectionHeader title="Link Steam" icon="🎮" />
          <p className="text-sm text-zinc-400 mb-4">
            Connect your Steam account to import your game library for tracking.
          </p>
          <motion.a
            href={steamLinkUrl()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1b2838] text-white font-medium hover:bg-[#2a475e] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.64 5.93h.03c3.14.2 5.58 2.82 5.58 5.93 0 3.29-2.68 5.97-5.97 5.97-3.09 0-5.63-2.36-5.93-5.37L.88 10.17A10.97 10.97 0 0 0 0 14.35C0 19.62 4.38 24 9.76 24a9.97 9.97 0 0 0 8.76-5.18A10.07 10.07 0 0 0 20 14.35c0-5.55-4.5-10.05-10.05-10.05-.47 0-.93.03-1.38.09l3.07 1.54z" />
            </svg>
            Connect Steam Account
          </motion.a>
        </AnimatedCard>
      )}


      {/* Link Marvel Rivals */}
      {!accounts.some(a => a.game === "MARVEL_RIVALS") && (
        <AnimatedCard delay={0.3} className="p-6 mb-6">
          <SettingsSectionHeader title="Link Marvel Rivals" icon="🦸" />
          <p className="text-sm text-zinc-500 mb-3">
            Enter your Marvel Rivals username exactly as it appears in-game.
          </p>
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">
              <strong>Note:</strong> Marvel Rivals uses unofficial community APIs (no official API exists).
              Match data may be delayed 24-48 hours and some matches may not appear.
              Make sure your in-game profile is set to public.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={mrUser}
                onChange={(e) => setMrUser(e.target.value)}
                placeholder="Username"
                className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
              />
              <select
                value={mrPlatform}
                onChange={(e) => setMrPlatform(e.target.value)}
                className="rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white focus:border-zinc-600 focus:outline-none transition-colors"
              >
                <option value="pc">PC</option>
                <option value="ps">PlayStation</option>
                <option value="xbox">Xbox</option>
              </select>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={linkMarvel}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium shadow-lg shadow-purple-500/20"
            >
              Link Marvel Rivals
            </motion.button>
          </div>
        </AnimatedCard>
      )}

      {/* Link Valorant */}
      {!accounts.some(a => a.game === "VALORANT") && (
        <AnimatedCard delay={0.35} className="p-6 mb-6">
          <SettingsSectionHeader title="Link Valorant" icon="🎯" />
          <p className="text-sm text-zinc-500 mb-4">
            Enter your Riot ID to connect your Valorant account. Format: Name#Tag (e.g., Player#NA1)
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={valRiotId}
                onChange={(e) => setValRiotId(e.target.value)}
                placeholder="Riot ID (Name#Tag)"
                className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
              />
              <select
                value={valRegion}
                onChange={(e) => setValRegion(e.target.value)}
                className="rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white focus:border-zinc-600 focus:outline-none transition-colors"
              >
                <option value="americas">Americas</option>
                <option value="europe">Europe</option>
                <option value="asia">Asia</option>
              </select>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={linkValorant}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium shadow-lg shadow-red-500/20"
            >
              Link Valorant
            </motion.button>
          </div>
        </AnimatedCard>
      )}

      {/* Link Supercell Games */}
      <AnimatedCard delay={0.4} className="p-6 mb-6">
        <SettingsSectionHeader title="Link Supercell Games" icon="⚔️" />
        <p className="text-sm text-zinc-500 mb-4">
          Connect your Clash Royale or Brawl Stars account using your Player Tag.
        </p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={scGame}
              onChange={(e) => setScGame(e.target.value)}
              className="rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white focus:border-zinc-600 focus:outline-none transition-colors"
            >
              <option value="CLASH_ROYALE">Clash Royale</option>
              <option value="BRAWL_STARS">Brawl Stars</option>
            </select>
            <input
              value={scTag}
              onChange={(e) => setScTag(e.target.value)}
              placeholder="Player Tag (#ABC123)"
              className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={linkSupercell}
            className={`w-full px-4 py-2.5 rounded-lg font-medium shadow-lg text-white ${
              scGame === "CLASH_ROYALE"
                ? "bg-gradient-to-r from-blue-500 to-cyan-600 shadow-blue-500/20"
                : "bg-gradient-to-r from-green-500 to-lime-600 shadow-green-500/20"
            }`}
          >
            Link {gameLabels[scGame]}
          </motion.button>
        </div>
      </AnimatedCard>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-zinc-800/50 pt-6 text-sm"
      >
        <div className="flex items-center justify-between">
          <div className="text-zinc-500">
            Signed in as <span className="text-zinc-300">{me?.email}</span>
          </div>
          <button
            onClick={async () => {
              await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}/auth/logout`, { credentials: "include" });
              window.location.href = "/login";
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            Log out
          </button>
        </div>
      </motion.footer>
    </div>
  );
}
