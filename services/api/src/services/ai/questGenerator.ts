import { env } from "../../env";
import { fetchJson } from "../../utils/http";

// Simple client for OpenAI chat completions
async function chatCompletion(system: string, user: string) {
    if (!env.OPENAI_API_KEY) return null;

    try {
        const res = await fetchJson<any>("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: env.OPENAI_MODEL,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                max_tokens: 300,
                temperature: 0.8,
            }),
        });
        return res.choices?.[0]?.message?.content ?? null;
    } catch (e) {
        console.error("AI completion failed", e);
        return null;
    }
}

export async function enhanceQuestMetadata(
    _questId: string,
    baseTitle: string,
    baseDescription: string,
    recentContext: string
) {
    const prompt = `You are a gaming coach. Quest: "${baseTitle}" - "${baseDescription}".
Recent play: ${recentContext}

Write a short personalized version. Be punchy or roast them if they played bad.

STRICT LIMITS:
- title: 3-5 words, complete phrase
- description: ONE short sentence, max 80 chars

JSON only: {"title":"...","description":"..."}`;

    const raw = await chatCompletion("Output valid JSON only.", prompt);
    if (!raw) return { title: baseTitle, description: baseDescription };

    try {
        const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, ""));

        let title = parsed.title?.slice(0, 50) ?? baseTitle;
        let description = parsed.description?.slice(0, 100) ?? baseDescription;

        // catch cut-off titles ending with articles/prepositions
        const badEnding = /(\s+(as|the|a|an|to|of|in|on|for|with|and|or|but|you|your|what|that)\s*)$/i;
        if (!title || title.length < 3 || badEnding.test(title)) {
            title = baseTitle;
        }

        // catch cut-off descriptions (ends mid-word like "you'")
        const cutOff = /[a-z]'?$/i;
        if (!description || description.length < 10 || cutOff.test(description)) {
            description = baseDescription;
        }

        return { title, description };
    } catch {
        return { title: baseTitle, description: baseDescription };
    }
}
