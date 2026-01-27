import { z } from "zod";

export const RewardTheme = z.object({
  monochrome: z.boolean().default(true),
  accent: z.enum(["NONE", "LINE", "DOT"]).default("LINE"),
});

export type RewardTheme = z.infer<typeof RewardTheme>;
