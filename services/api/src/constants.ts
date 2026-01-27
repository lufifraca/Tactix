// Polyfills for items removed from Prisma Enums to Strings
// This allows existing code to continue working with massive refactors.

export const Game = {
    CS2: "CS2",
    MARVEL_RIVALS: "MARVEL_RIVALS",
} as const;

export type Game = (typeof Game)[keyof typeof Game] | string;

export const GameProvider = {
    STEAM: "STEAM",
    TRACKER_NETWORK: "TRACKER_NETWORK",
    COMMUNITY: "COMMUNITY",
    SUPERCELL: "SUPERCELL", // New!
} as const;

export type GameProvider = (typeof GameProvider)[keyof typeof GameProvider] | string;

export const MatchMode = {
    RANKED: "RANKED",
    UNRANKED: "UNRANKED",
    UNKNOWN: "UNKNOWN",
} as const;

export type MatchMode = (typeof MatchMode)[keyof typeof MatchMode] | string;

export const MatchResult = {
    WIN: "WIN",
    LOSS: "LOSS",
    DRAW: "DRAW",
    UNKNOWN: "UNKNOWN",
} as const;

export type MatchResult = (typeof MatchResult)[keyof typeof MatchResult] | string;

export const SkillDomain = {
    AIM_QUALITY: "AIM_QUALITY",
    FIRST_ENGAGEMENT: "FIRST_ENGAGEMENT",
    SURVIVAL_QUALITY: "SURVIVAL_QUALITY",
    OBJECTIVE_IMPACT: "OBJECTIVE_IMPACT",
    UTILITY_INTENT: "UTILITY_INTENT",
    CONSISTENCY: "CONSISTENCY",
} as const;

export type SkillDomain = (typeof SkillDomain)[keyof typeof SkillDomain] | string;

export const QuestStatus = {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    EXPIRED: "EXPIRED",
} as const;

export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus] | string;

export const RewardType = {
    BADGE: "BADGE",
    CARD: "CARD",
} as const;

export type RewardType = (typeof RewardType)[keyof typeof RewardType] | string;

export const SubscriptionStatus = {
    INACTIVE: "INACTIVE",
    ACTIVE: "ACTIVE",
    PAST_DUE: "PAST_DUE",
    CANCELED: "CANCELED",
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus] | string;
