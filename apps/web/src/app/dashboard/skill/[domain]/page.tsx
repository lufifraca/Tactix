"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { apiGet } from "@/lib/api";
import { gameColors, gameLabels, domainLabels } from "@/lib/gameTheme";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GamePieChart } from "@/components/GamePieChart";

// Animated line chart
function AnimatedLineChart({ data }: { data: { date: string; score: number }[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        Not enough history data yet
      </div>
    );
  }

  const h = 150;
  const w = 400;
  const padding = 20;

  const scores = data.map(d => d.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 100);
  const range = maxScore - minScore || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - ((d.score - minScore) / range) * (h - padding * 2);
    return { x, y, score: d.score, date: d.date };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
      {/* Grid lines */}
      <line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="#333" strokeWidth="1" />
      <line x1={padding} y1={padding} x2={w - padding} y2={padding} stroke="#333" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <line x1={padding} y1={h / 2} x2={w - padding} y2={h / 2} stroke="#333" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

      {/* Gradient fill under line */}
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${pathD} L ${points[points.length - 1].x} ${h - padding} L ${points[0].x} ${h - padding} Z`}
        fill="url(#lineGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />

      {/* The Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#lineStroke)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="lineStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Dots */}
      {points.map((p, i) => (
        <motion.g key={i}>
          <motion.circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill="#0f0f0f"
            stroke="#06b6d4"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
            style={{ filter: "drop-shadow(0 0 4px #06b6d4)" }}
          />
        </motion.g>
      ))}

      {/* Labels */}
      <text x={padding} y={h - 5} fill="#666" fontSize="10">{data[0]?.date}</text>
      <text x={w - padding} y={h - 5} fill="#666" fontSize="10" textAnchor="end">{data[data.length - 1]?.date}</text>
    </svg>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-zinc-800/50 rounded-xl" />
          <div className="h-64 bg-zinc-800/50 rounded-xl" />
        </div>
        <div className="h-48 bg-zinc-800/50 rounded-xl" />
      </div>
    </div>
  );
}

export default function SkillDetailPage() {
  const { domain } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;
    apiGet(`/dashboard/skill/${domain}`)
      .then(setData)
      .catch((e) => {
        console.error(e);
        setError("Failed to load skill data");
      })
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-8 text-center text-zinc-500">
          {error || "No data available for this skill domain."}
        </div>
      </div>
    );
  }

  const domainName = domainLabels[(domain as string).toUpperCase()] || domain;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          {domainName}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Detailed skill analysis</p>
      </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Score Card */}
          <AnimatedCard delay={0.1} className="p-6">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Current Score</div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
            >
              {data.score}
            </motion.div>
            <div className="mt-1 text-sm text-zinc-500">out of 100</div>

            {/* Progress ring */}
            <div className="mt-6">
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${data.score}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  style={{ boxShadow: "0 0 20px rgba(6, 182, 212, 0.5)" }}
                />
              </div>
            </div>

            {/* Game Composition */}
            <div className="mt-8">
              <div className="text-sm text-zinc-400 mb-4">Score Composition by Game</div>
              <GamePieChart counts={data.breakdown?.attributionCounts} />
            </div>
          </AnimatedCard>

          {/* History Chart */}
          <AnimatedCard delay={0.2} className="p-6">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4">30-Day Trend</div>
            <div className="h-[200px] w-full">
              <AnimatedLineChart data={data.history} />
            </div>
          </AnimatedCard>
        </div>

        {/* Score Factors */}
        {data.breakdown && Object.keys(data.breakdown).filter(k => k !== 'attributionCounts' && typeof data.breakdown[k] === 'number').length > 0 && (
          <AnimatedCard delay={0.3} className="mt-6 p-6">
            <div className="text-lg font-semibold text-white mb-4">Score Factors</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(data.breakdown || {}).map(([key, val]: [string, any], i) => {
                if (key === "attributionCounts") return null;
                if (typeof val !== "number") return null;

                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-800"
                  >
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {typeof val === 'number' ? val.toFixed(1) : val}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatedCard>
        )}

        {/* Recent Matches */}
        <AnimatedCard delay={0.4} className="mt-6 p-6">
          <div className="text-lg font-semibold text-white mb-4">Recent Contributing Matches</div>
          <div className="space-y-3">
            {data.matches && data.matches.filter((m: any) => m.game !== "CS2").length > 0 ? (
              data.matches.filter((m: any) => m.game !== "CS2").map((m: any, i: number) => {
                const colors = gameColors[m.game] || gameColors.MARVEL_RIVALS;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl border border-zinc-800/50 bg-gradient-to-r ${colors.gradient} hover:border-zinc-700 transition-all`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-1.5 h-12 rounded-full ${m.result === "WIN" ? "bg-green-500 shadow-lg shadow-green-500/30" : "bg-red-500 shadow-lg shadow-red-500/30"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{gameLabels[m.game] || m.game}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{m.mode}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${m.result === "WIN" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {m.result}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {m.date ? new Date(m.date).toLocaleString() : "Unknown date"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {m.stats?.kills !== undefined && (
                        <div className="text-lg font-mono text-white">
                          <span className="text-green-400">{m.stats.kills}</span>
                          <span className="text-zinc-600 mx-1">/</span>
                          <span className="text-red-400">{m.stats.deaths}</span>
                          <span className="text-zinc-600 mx-1">/</span>
                          <span className="text-blue-400">{m.stats.assists || 0}</span>
                        </div>
                      )}
                      {m.stats?.crowns !== undefined && (
                        <div className="text-lg font-mono text-amber-400">
                          {m.stats.crowns} Crowns
                        </div>
                      )}
                      {m.stats?.damageDealt !== undefined && (
                        <div className="text-xs text-zinc-500 mt-1">
                          {m.stats.damageDealt?.toLocaleString()} damage
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center text-zinc-500 py-8">
                No recent matches found for this skill domain.
              </div>
            )}
          </div>
        </AnimatedCard>
    </div>
  );
}
