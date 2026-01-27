import { z } from "zod";
import { Game, MatchMode, SkillDomain } from "./schema";

export const QuestCriteria = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("aggregate"),
    metric: z.string(), // canonical stat field name
    op: z.enum([">=", "<="]),
    target: z.number(),
    game: Game.nullable().optional(), // null means any
    mode: MatchMode,
  }),
  z.object({
    type: z.literal("rate"),
    numerator: z.string(),
    denominator: z.string(),
    op: z.enum([">=", "<="]),
    target: z.number(),
    game: Game.nullable().optional(),
    mode: MatchMode,
    minDenominator: z.number().optional(),
  }),
  z.object({
    type: z.literal("perMatch"),
    metric: z.string(),
    op: z.enum([">=", "<="]),
    target: z.number(),
    minMatches: z.number().int().min(1),
    game: Game.nullable().optional(),
    mode: MatchMode,
  }),
]);

export type QuestCriteria = z.infer<typeof QuestCriteria>;

export const QuestTemplate = z.object({
  id: z.string(),
  domain: SkillDomain,
  title: z.string(),
  description: z.string(),
  criteria: QuestCriteria,
  eligibleGames: z.array(Game),
  eligibleModes: z.array(MatchMode),
  weight: z.number().default(1),
});
export type QuestTemplate = z.infer<typeof QuestTemplate>;
