import { z } from "zod";

export const Game = z.string();
export type Game = z.infer<typeof Game>;

export const MatchMode = z.string();
export type MatchMode = z.infer<typeof MatchMode>;

/**
 * Canonical per-match stats schema (subset is ok — provider mapping can leave fields null/undefined).
 * Everything in v1 quests/scoring must be derived from these or other stored deterministic fields.
 */
export const CanonicalMatchStats = z.object({
  // combat
  kills: z.number().int().nonnegative().optional(),
  deaths: z.number().int().nonnegative().optional(),
  assists: z.number().int().nonnegative().optional(),
  headshots: z.number().int().nonnegative().optional(),
  damageDealt: z.number().nonnegative().optional(),
  damageTaken: z.number().nonnegative().optional(),
  healingDone: z.number().nonnegative().optional(),
  shieldsGiven: z.number().nonnegative().optional(),

  // pacing / context
  matchDurationSeconds: z.number().int().positive().optional(),
  roundsPlayed: z.number().int().positive().optional(),

  // first engagement (opening duel / early fight)
  firstEngagementWins: z.number().int().nonnegative().optional(),
  firstEngagementLosses: z.number().int().nonnegative().optional(),

  // objective
  objectiveTimeSeconds: z.number().nonnegative().optional(),
  objectivesCaptured: z.number().int().nonnegative().optional(),
  plants: z.number().int().nonnegative().optional(),
  defuses: z.number().int().nonnegative().optional(),

  // utility / intent
  utilityDamage: z.number().nonnegative().optional(),
  flashesThrown: z.number().int().nonnegative().optional(),
  flashAssists: z.number().int().nonnegative().optional(),
  smokesThrown: z.number().int().nonnegative().optional(),
  grenadesThrown: z.number().int().nonnegative().optional(),

  // score/impact
  score: z.number().nonnegative().optional(),
  mvp: z.number().int().nonnegative().optional(),

  // generic
  win: z.boolean().optional(),

  // provider-specific extra normalized fields
  extra: z.record(z.string(), z.any()).optional(),
});
export type CanonicalMatchStats = z.infer<typeof CanonicalMatchStats>;

export const CanonicalMatch = z.object({
  game: Game,
  matchId: z.string(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  mode: z.string().default("UNKNOWN"),
  map: z.string().optional(),
  result: z.string().default("UNKNOWN"),
  stats: CanonicalMatchStats,
  source: z.string(),
});
export type CanonicalMatch = z.infer<typeof CanonicalMatch>;

// API surface types
export const DailyBrief = z.object({
  date: z.string(), // YYYY-MM-DD in UTC
  bullets: z.tuple([z.string(), z.string(), z.string()]),
});
export type DailyBrief = z.infer<typeof DailyBrief>;

export const UserPublic = z.object({
  id: z.string(),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type UserPublic = z.infer<typeof UserPublic>;

export const SkillDomain = z.string();
export type SkillDomain = z.infer<typeof SkillDomain>;

export const SkillScore = z.object({
  domain: SkillDomain,
  score: z.number().int().min(0).max(100),
  delta7d: z.number().int(), // could be negative
  details: z.record(z.string(), z.any()).optional(),
  attribution: z.array(z.string()).optional(), // e.g. ["CS2", "CLASH_ROYALE"]
});
export type SkillScore = z.infer<typeof SkillScore>;

export const QuestStatus = z.enum(["ACTIVE", "COMPLETED", "EXPIRED"]);
export type QuestStatus = z.infer<typeof QuestStatus>;

export const Quest = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD in UTC
  slot: z.number().int(),
  isPremium: z.boolean(),
  game: Game.nullable(),
  domain: SkillDomain,
  title: z.string(),
  description: z.string(),
  modeEligibility: z.string(),
  criteria: z.record(z.string(), z.any()),
  progress: z.record(z.string(), z.any()),
  status: QuestStatus,
});
export type Quest = z.infer<typeof Quest>;

export const RewardType = z.enum(["BADGE", "CARD"]);
export type RewardType = z.infer<typeof RewardType>;

export const Reward = z.object({
  id: z.string(),
  type: RewardType,
  title: z.string(),
  caption: z.string(),
  imageUrl: z.string(),
  isPublic: z.boolean(),
  shareUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type Reward = z.infer<typeof Reward>;

export const RankSnapshot = z.object({
  game: z.string(),
  rankTier: z.string().nullable(),
  rankDivision: z.string().nullable(),
  rankNumeric: z.number().nullable(),
  percentile: z.number().nullable(),
  capturedAt: z.string().datetime(),
  change: z.number().nullable(),
  trend: z.enum(["up", "down", "stable"]).nullable(),
});
export type RankSnapshot = z.infer<typeof RankSnapshot>;

// Session Intelligence Types
export const TimeOfDayBucket = z.enum(["morning", "afternoon", "evening", "night"]);
export type TimeOfDayBucket = z.infer<typeof TimeOfDayBucket>;

export const DayOfWeek = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export type DayOfWeek = z.infer<typeof DayOfWeek>;

export const SessionLengthCategory = z.enum(["short", "medium", "long"]);
export type SessionLengthCategory = z.infer<typeof SessionLengthCategory>;

export const WinRateBucket = z.object({
  wins: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1).nullable(), // null if total is 0
});
export type WinRateBucket = z.infer<typeof WinRateBucket>;

export const TimeOfDayPerformance = z.object({
  morning: WinRateBucket,   // 6-12
  afternoon: WinRateBucket, // 12-18
  evening: WinRateBucket,   // 18-24
  night: WinRateBucket,     // 0-6
  bestTime: TimeOfDayBucket.nullable(),
  worstTime: TimeOfDayBucket.nullable(),
});
export type TimeOfDayPerformance = z.infer<typeof TimeOfDayPerformance>;

export const DayOfWeekPerformance = z.object({
  monday: WinRateBucket,
  tuesday: WinRateBucket,
  wednesday: WinRateBucket,
  thursday: WinRateBucket,
  friday: WinRateBucket,
  saturday: WinRateBucket,
  sunday: WinRateBucket,
  bestDay: DayOfWeek.nullable(),
  worstDay: DayOfWeek.nullable(),
});
export type DayOfWeekPerformance = z.infer<typeof DayOfWeekPerformance>;

export const SessionLengthPerformance = z.object({
  short: WinRateBucket,   // 1-3 games
  medium: WinRateBucket,  // 4-7 games
  long: WinRateBucket,    // 8+ games
  optimalLength: SessionLengthCategory.nullable(),
});
export type SessionLengthPerformance = z.infer<typeof SessionLengthPerformance>;

export const TiltAnalysis = z.object({
  afterLoss1: WinRateBucket,       // performance after 1 consecutive loss
  afterLoss2: WinRateBucket,       // performance after 2 consecutive losses
  afterLoss3Plus: WinRateBucket,   // performance after 3+ consecutive losses
  tiltThreshold: z.number().int().nullable(), // at how many losses does performance significantly drop
  isTilting: z.boolean(),          // currently in a tilt state based on recent matches
  currentLossStreak: z.number().int().nonnegative(),
});
export type TiltAnalysis = z.infer<typeof TiltAnalysis>;

export const OptimalSessionInfo = z.object({
  winRateByPosition: z.record(z.string(), z.number()), // { "1": 0.55, "2": 0.52, ... }
  optimalGameCount: z.number().int().nullable(), // recommended number of games before performance typically declines
  declinePoint: z.number().int().nullable(), // at what game number does performance typically start declining
});
export type OptimalSessionInfo = z.infer<typeof OptimalSessionInfo>;

export const SessionSummary = z.object({
  id: z.string(),
  game: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  matchCount: z.number().int(),
  winCount: z.number().int(),
  lossCount: z.number().int(),
  drawCount: z.number().int(),
  winRate: z.number().min(0).max(1),
  totalDurationMinutes: z.number(),
  longestStreak: z.number().int(),
  streakType: z.enum(["WIN", "LOSS"]).nullable(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const TiltAlert = z.object({
  shouldTakeBreak: z.boolean(),
  reason: z.string().nullable(),
  severity: z.enum(["low", "medium", "high"]).nullable(),
  suggestedBreakMinutes: z.number().int().nullable(),
});
export type TiltAlert = z.infer<typeof TiltAlert>;

export const SessionInsights = z.object({
  timeOfDay: TimeOfDayPerformance,
  dayOfWeek: DayOfWeekPerformance,
  sessionLength: SessionLengthPerformance,
  tilt: TiltAnalysis,
  optimalSession: OptimalSessionInfo,
  recentSessions: z.array(SessionSummary),
  tiltAlert: TiltAlert,
  totalMatchesAnalyzed: z.number().int(),
  totalSessionsAnalyzed: z.number().int(),
});
export type SessionInsights = z.infer<typeof SessionInsights>;

export const SessionInsightsResponse = z.object({
  overall: SessionInsights,
  byGame: z.record(z.string(), SessionInsights),
});
export type SessionInsightsResponse = z.infer<typeof SessionInsightsResponse>;

// Today's Performance Summary
export const TodayPerformance = z.object({
  matchesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1).nullable(),
  totalKills: z.number().int().nonnegative(),
  totalDeaths: z.number().int().nonnegative(),
  totalAssists: z.number().int().nonnegative(),
  timePlayedSeconds: z.number().int().nonnegative(),
  byGame: z.record(z.string(), z.object({
    matchesPlayed: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
  })),
});
export type TodayPerformance = z.infer<typeof TodayPerformance>;

// Streaks & Milestones
export const GameStreak = z.object({
  game: z.string(),
  currentStreak: z.number().int(),
  streakType: z.enum(["WIN", "LOSS"]).nullable(),
});
export type GameStreak = z.infer<typeof GameStreak>;

export const Milestone = z.object({
  type: z.string(),
  label: z.string(),
  game: z.string().nullable(),
  value: z.number(),
});
export type Milestone = z.infer<typeof Milestone>;

export const StreaksAndMilestones = z.object({
  questStreak: z.object({
    current: z.number().int().nonnegative(),
    best: z.number().int().nonnegative(),
  }),
  gameStreaks: z.array(GameStreak),
  milestones: z.array(Milestone),
});
export type StreaksAndMilestones = z.infer<typeof StreaksAndMilestones>;

export const RankHistoryPoint = z.object({
  rankTier: z.string().nullable(),
  rankNumeric: z.number().nullable(),
  capturedAt: z.string().datetime(),
});
export type RankHistoryPoint = z.infer<typeof RankHistoryPoint>;

export const RankHistoryResponse = z.object({
  game: z.string(),
  history: z.array(RankHistoryPoint),
});
export type RankHistoryResponse = z.infer<typeof RankHistoryResponse>;

export const CharacterStat = z.object({
  character: z.string(),
  game: z.string(),
  gamesPlayed: z.number().int(),
  wins: z.number().int(),
  losses: z.number().int(),
  winRate: z.number(),
  avgKills: z.number().nullable(),
  avgDeaths: z.number().nullable(),
  avgAssists: z.number().nullable(),
});
export type CharacterStat = z.infer<typeof CharacterStat>;

export const CharacterBreakdownResponse = z.object({
  characters: z.array(CharacterStat),
  totalGames: z.number().int(),
});
export type CharacterBreakdownResponse = z.infer<typeof CharacterBreakdownResponse>;

export const OnboardingState = z.enum(["NEEDS_GAME_LINK", "NEEDS_FIRST_INGEST", "COMPLETE"]);
export type OnboardingState = z.infer<typeof OnboardingState>;

export const DashboardResponse = z.object({
  me: UserPublic,
  subscriptionActive: z.boolean(),
  modeFilter: MatchMode,
  onboardingState: OnboardingState,
  dailyBrief: DailyBrief.nullable(),
  skillScores: z.array(SkillScore),
  quests: z.array(Quest),
  rewards: z.array(Reward),
  lastIngestAt: z.string().datetime().nullable(),
  library: z.array(z.object({
    name: z.string(),
    playtimeMinutes: z.number(),
    iconUrl: z.string().optional(),
  })).optional(),
  ranks: z.record(z.string(), RankSnapshot).optional(),
  sessionInsights: SessionInsights.optional(),
  tiltAlert: TiltAlert.optional(),
  todayPerformance: TodayPerformance.optional(),
  streaksAndMilestones: StreaksAndMilestones.optional(),
});
export type DashboardResponse = z.infer<typeof DashboardResponse>;
