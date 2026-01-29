export const gameColors: Record<string, { primary: string; glow: string; gradient: string; bg: string; border: string }> = {
  MARVEL_RIVALS: {
    primary: "#a855f7",
    glow: "shadow-purple-500/20",
    gradient: "from-purple-500/20 to-pink-600/10",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  CLASH_ROYALE: {
    primary: "#3b82f6",
    glow: "shadow-blue-500/20",
    gradient: "from-blue-500/20 to-cyan-600/10",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  BRAWL_STARS: {
    primary: "#22c55e",
    glow: "shadow-green-500/20",
    gradient: "from-green-500/20 to-lime-600/10",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  VALORANT: {
    primary: "#ff4655",
    glow: "shadow-red-500/20",
    gradient: "from-red-500/20 to-rose-600/10",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
};

export const gameLabels: Record<string, string> = {
  MARVEL_RIVALS: "Marvel Rivals",
  CLASH_ROYALE: "Clash Royale",
  BRAWL_STARS: "Brawl Stars",
  VALORANT: "Valorant",
};

export const gameShortLabels: Record<string, string> = {
  MARVEL_RIVALS: "Marvel Rivals",
  CLASH_ROYALE: "Clash Royale",
  BRAWL_STARS: "Brawl Stars",
  VALORANT: "Valorant",
};

export const domainLabels: Record<string, string> = {
  MECHANICS: "Mechanics",
  AGGRESSION: "Aggression",
  VITALITY: "Vitality",
  OBJECTIVE: "Objective",
  TEAMWORK: "Teamwork",
  CONSISTENCY: "Consistency",
  VERSATILITY: "Versatility",
};
