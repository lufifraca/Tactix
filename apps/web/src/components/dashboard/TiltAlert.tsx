"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { DashboardResponse } from "@tactix/shared";
import { ShieldAlert, AlertTriangle, Lightbulb } from "@/components/icons";

export function TiltAlert({ data }: { data: DashboardResponse }) {
  const alert = data.tiltAlert;

  return (
    <AnimatePresence>
      {alert?.shouldTakeBreak && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6"
        >
          <div
            className={`rounded-xl p-4 backdrop-blur-sm ${
              alert.severity === "high"
                ? "border border-red-500/30 bg-gradient-to-r from-red-950/50 to-red-900/30"
                : alert.severity === "medium"
                  ? "border border-orange-500/30 bg-gradient-to-r from-orange-950/50 to-amber-900/30"
                  : "border border-yellow-500/30 bg-gradient-to-r from-yellow-950/50 to-amber-900/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  alert.severity === "high"
                    ? "bg-red-500/20 text-red-400"
                    : alert.severity === "medium"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {alert.severity === "high" ? (
                  <ShieldAlert size={20} />
                ) : alert.severity === "medium" ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Lightbulb size={20} />
                )}
              </motion.span>
              <div>
                <div className="font-semibold text-white">
                  {alert.severity === "high"
                    ? "Time for a Break"
                    : alert.severity === "medium"
                      ? "Consider Taking a Break"
                      : "Quick Heads Up"}
                </div>
                <div className="mt-1 text-sm text-zinc-300">{alert.reason}</div>
                {alert.suggestedBreakMinutes && (
                  <div className="mt-2 text-xs text-zinc-400">
                    Suggested break: {alert.suggestedBreakMinutes} minutes
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
