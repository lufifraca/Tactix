"use client";

import { motion } from "framer-motion";

export function AnimatedCard({
  children,
  delay = 0,
  className = "",
  glowColor,
  onClick,
  interactive,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  /** When true (or when onClick is set), the card lifts on hover and shows a pointer. */
  interactive?: boolean;
}) {
  // Only emphasize cards the user can actually act on. Previously every card
  // scaled + showed a pointer, which made the whole page feel "clickable".
  const isInteractive = interactive ?? Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={
        isInteractive
          ? { y: -3, transition: { duration: 0.2 } }
          : undefined
      }
      className={`
        relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm
        transition-colors duration-300
        ${isInteractive
          ? `cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/70 ${glowColor ? `hover:shadow-lg hover:${glowColor}` : "hover:shadow-lg hover:shadow-black/20"}`
          : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
