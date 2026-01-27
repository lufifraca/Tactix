"use client";

import { motion } from "framer-motion";

export function AnimatedCard({
  children,
  delay = 0,
  className = "",
  glowColor,
  onClick,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { duration: 0.2 },
      }}
      className={`
        relative rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm
        transition-all duration-300 cursor-pointer
        hover:border-zinc-700 hover:bg-zinc-900/80
        ${glowColor ? `hover:shadow-lg hover:${glowColor}` : "hover:shadow-lg hover:shadow-white/5"}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
