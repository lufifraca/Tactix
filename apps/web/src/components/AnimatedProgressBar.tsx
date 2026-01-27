"use client";

import { motion } from "framer-motion";

export function AnimatedProgressBar({
  value,
  color = "white",
  delay = 0,
}: {
  value: number;
  color?: string;
  delay?: number;
}) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800/50 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}40`,
        }}
      />
    </div>
  );
}
