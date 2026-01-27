"use client";

import { motion } from "framer-motion";

interface Point {
  rankNumeric: number | null;
  capturedAt: string;
}

export function RankSparkline({ history }: { history: Point[] }) {
  const data = history.filter((p) => p.rankNumeric != null) as { rankNumeric: number; capturedAt: string }[];
  if (data.length < 2) return null;

  const w = 200;
  const h = 40;
  const px = 4;
  const py = 4;

  const values = data.map((d) => d.rankNumeric);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: px + (i / (data.length - 1)) * (w - px * 2),
    y: py + (1 - (d.rankNumeric - min) / range) * (h - py * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  // Trend: compare last point to first
  const first = values[0];
  const last = values[values.length - 1];
  const trendColor = last > first ? "#22c55e" : last < first ? "#ef4444" : "#71717a";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10 overflow-visible">
      <defs>
        <linearGradient id={`spark-fill-${first}-${last}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={trendColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <motion.path
        d={`${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h} L ${points[0].x.toFixed(1)} ${h} Z`}
        fill={`url(#spark-fill-${first}-${last})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={trendColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {/* End dot */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={trendColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8 }}
        style={{ filter: `drop-shadow(0 0 4px ${trendColor})` }}
      />
    </svg>
  );
}
