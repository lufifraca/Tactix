"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiGet, authUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet<{ authenticated: boolean }>("/auth/session")
      .then((r) => {
        setAuthed(r.authenticated);
        if (r.authenticated) router.replace("/dashboard");
      })
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, [router]);

  if (authed === true) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-purple-500/5 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Logo/Brand */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-6 shadow-2xl shadow-purple-500/30"
          >
            <span className="text-4xl font-bold text-white">T</span>
          </motion.div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Welcome to Tactix
          </h1>
          <p className="mt-3 text-zinc-400 text-lg">
            Your cross-game coaching companion
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl p-8 shadow-2xl"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white">Sign in</h2>
            <p className="text-sm text-zinc-500 mt-1">Choose your preferred method</p>
          </div>

          <div className="space-y-3">
            <motion.a
              href={authUrl("google")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-3 w-full rounded-xl bg-white px-4 py-3.5 text-zinc-900 font-medium shadow-lg shadow-white/10 hover:shadow-white/20 transition-shadow"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </motion.a>

            <motion.a
              href={authUrl("discord")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-3 w-full rounded-xl bg-[#5865F2] px-4 py-3.5 text-white font-medium shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/40 transition-shadow"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Continue with Discord
            </motion.a>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 text-center leading-relaxed">
              Steam linking is available after sign-in for CS2 stat tracking.
              By continuing, you agree to basic data processing for match stats.
            </p>
          </div>
        </motion.div>

        {/* Features preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-10 grid grid-cols-3 gap-4"
        >
          {[
            { icon: "🎮", label: "Multi-Game" },
            { icon: "📊", label: "Smart Stats" },
            { icon: "🎯", label: "Daily Quests" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs text-zinc-500">{item.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Games supported */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-zinc-600 mb-3">Supported Games</p>
          <div className="flex justify-center gap-6">
            {[
              { name: "CS2", color: "#f59e0b" },
              { name: "Marvel Rivals", color: "#a855f7" },
              { name: "Clash Royale", color: "#3b82f6" },
              { name: "Brawl Stars", color: "#22c55e" },
            ].map((game, i) => (
              <motion.div
                key={game.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: game.color, boxShadow: `0 0 8px ${game.color}60` }}
                />
                <span className="text-xs text-zinc-500">{game.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
