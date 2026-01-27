"use client";

import { motion } from "framer-motion";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 24 }}
          transition={{ duration: 0.4 }}
          className="h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
        />
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-300">{title}</h2>
      </div>
      {subtitle && <span className="text-xs text-zinc-600">{subtitle}</span>}
    </div>
  );
}
