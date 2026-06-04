import type { ComponentType } from "react";
import {
  Gamepad2,
  Crosshair,
  Target,
  Crown,
  Zap,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Flame,
  Activity,
  BarChart3,
  Gauge,
  Star,
  Trophy,
  Skull,
  Lightbulb,
  ShieldAlert,
  AlertTriangle,
  type IconProps,
} from "@/components/icons";

type Icon = ComponentType<IconProps>;

/** Per-game icon (replaces the old emoji map). */
export const gameIcons: Record<string, Icon> = {
  MARVEL_RIVALS: Crown,
  VALORANT: Crosshair,
  CLASH_ROYALE: Trophy,
  BRAWL_STARS: Star,
};

export function gameIcon(game: string): Icon {
  return gameIcons[game] ?? Gamepad2;
}

/** Skill-domain icon + one-line meaning. */
export const domainMeta: Record<string, { icon: Icon; blurb: string }> = {
  MECHANICS: { icon: Crosshair, blurb: "Aim & raw execution" },
  AGGRESSION: { icon: Zap, blurb: "Opening duels & tempo" },
  VITALITY: { icon: Activity, blurb: "Staying alive & trading well" },
  TEAMWORK: { icon: Star, blurb: "Utility, assists & support" },
  CONSISTENCY: { icon: BarChart3, blurb: "Match-to-match stability" },
  VERSATILITY: { icon: Gamepad2, blurb: "Range across your games" },
  OBJECTIVE: { icon: Target, blurb: "Map & objective control" },
};

/** Time-of-day bucket presentation. */
export const timeMeta: Record<
  "morning" | "afternoon" | "evening" | "night",
  { icon: Icon; label: string; range: string }
> = {
  morning: { icon: Sunrise, label: "Morning", range: "6AM–12PM" },
  afternoon: { icon: Sun, label: "Afternoon", range: "12PM–6PM" },
  evening: { icon: Sunset, label: "Evening", range: "6PM–12AM" },
  night: { icon: Moon, label: "Night", range: "12AM–6AM" },
};

/** Session-length bucket presentation. */
export const sessionLengthMeta: Record<
  "short" | "medium" | "long",
  { icon: Icon; label: string; games: string }
> = {
  short: { icon: Zap, label: "Short Sessions", games: "1–3 games" },
  medium: { icon: Target, label: "Medium Sessions", games: "4–7 games" },
  long: { icon: Flame, label: "Long Sessions", games: "8+ games" },
};

/** Maps the AI coach's icon hint string → an icon component. */
export const coachIcons: Record<string, Icon> = {
  flame: Flame,
  trophy: Trophy,
  skull: Skull,
  bulb: Lightbulb,
  shield: ShieldAlert,
  alert: AlertTriangle,
  clock: Sun,
  gauge: Gauge,
  target: Target,
  zap: Zap,
  star: Star,
  activity: Activity,
};
