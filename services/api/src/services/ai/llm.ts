import { env } from "../../env";
import { fetchJson } from "../../utils/http";

/**
 * Provider-agnostic JSON completion helper.
 *
 * Prefers Anthropic Claude, falls back to OpenAI, and returns `null` when no
 * provider is configured (callers must then use a deterministic fallback).
 * Both providers are asked to return strict JSON; we tolerate ```json fences.
 */
export type LlmProvider = "anthropic" | "openai" | "none";

export function activeProvider(): LlmProvider {
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY) return "openai";
  return "none";
}

function stripFences(raw: string): string {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}

async function anthropic(system: string, user: string, maxTokens: number): Promise<string | null> {
  const res = await fetchJson<any>("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  // content is an array of blocks; concatenate any text blocks.
  const text = (res?.content ?? [])
    .filter((b: any) => b?.type === "text")
    .map((b: any) => b.text)
    .join("");
  return text || null;
}

async function openai(system: string, user: string, maxTokens: number): Promise<string | null> {
  const res = await fetchJson<any>("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  return res.choices?.[0]?.message?.content ?? null;
}

/** Returns parsed JSON of type T, or null on any failure (caller falls back). */
export async function completeJson<T>(
  system: string,
  user: string,
  opts: { maxTokens?: number } = {}
): Promise<T | null> {
  const provider = activeProvider();
  if (provider === "none") return null;

  const maxTokens = opts.maxTokens ?? 600;
  try {
    const raw =
      provider === "anthropic"
        ? await anthropic(system, user, maxTokens)
        : await openai(system, user, maxTokens);
    if (!raw) return null;
    return JSON.parse(stripFences(raw)) as T;
  } catch (e) {
    console.error(`[ai] ${provider} completion failed`, e);
    return null;
  }
}
