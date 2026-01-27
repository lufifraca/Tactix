import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(16),

  API_PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().url().default("http://localhost:3001"),
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),

  STEAM_REALM: z.string().optional(),
  STEAM_RETURN_TO: z.string().optional(),

  STEAM_WEB_API_KEY: z.string().optional(),

  STEAM_BOT_USERNAME: z.string().optional(),
  STEAM_BOT_PASSWORD: z.string().optional(),
  STEAM_BOT_SHARED_SECRET: z.string().optional(),

  TRN_API_KEY: z.string().optional(),
  MARVEL_RIVALS_API_BASE: z.string().url().optional(),
  MARVEL_RIVALS_API_KEY: z.string().optional(),

  CLASH_ROYALE_API_TOKEN: z.string().optional(),
  BRAWL_STARS_API_TOKEN: z.string().optional(),

  // Riot Games (Valorant, LoL, TFT, etc.)
  RIOT_API_KEY: z.string().optional(),
  RIOT_CLIENT_ID: z.string().optional(),
  RIOT_CLIENT_SECRET: z.string().optional(),
  RIOT_REDIRECT_URI: z.string().optional(),

  // Henrik's unofficial Valorant API (https://docs.henrikdev.xyz)
  // Free tier: 30 req/min; get a key at https://api.henrikdev.xyz/dashboard/
  HENRIK_API_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_MONTHLY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  EXPO_ACCESS_TOKEN: z.string().optional(),

  MOBILE_DEEPLINK_SCHEME: z.string().default("tactix"),
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
console.log("ENV CHECK steam key present:", Boolean(process.env.STEAM_WEB_API_KEY));
console.log("ENV CHECK riot key present:", Boolean(process.env.RIOT_API_KEY));
console.log("ENV CHECK henrik key present:", Boolean(process.env.HENRIK_API_KEY));
console.log("ENV CHECK marvel rivals key present:", Boolean(process.env.MARVEL_RIVALS_API_KEY));

