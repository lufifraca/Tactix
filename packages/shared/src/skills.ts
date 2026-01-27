import { z } from "zod";
import { SkillDomain } from "./schema";

export const SkillBreakdown = z.object({
  domain: SkillDomain,
  score: z.number().int().min(0).max(100),
  components: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.number(),
      weight: z.number(),
    })
  ),
  explanation: z.string(),
});

export type SkillBreakdown = z.infer<typeof SkillBreakdown>;
