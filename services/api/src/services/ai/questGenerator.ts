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
    questId: string,
    baseTitle: string,
    baseDescription: string,
    recentContext: string
) {
    const prompt = `
    You are a tactical gaming coach.
    The user has a quest: "${baseTitle}" - "${baseDescription}".

    Context about their recent play:
    ${recentContext}

    Generate a new, personalized Title and Description for this quest that feels responsive to their recent history.
    It should be punchy, encouraging, or slightly roasting if they played bad.

    IMPORTANT RULES:
    - Title must be a COMPLETE phrase (3-6 words max), never cut off mid-sentence
    - Description must be a COMPLETE sentence (1-2 sentences max)
    - Do not use ellipsis or trailing punctuation that suggests continuation

    Output JSON only: { "title": "...", "description": "..." }
  `;

    const raw = await chatCompletion("Output valid JSON only.", prompt);
    if (!raw) return { title: baseTitle, description: baseDescription };

    try {
        const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, ""));

        let title = parsed.title?.slice(0, 60) ?? baseTitle;
        let description = parsed.description?.slice(0, 150) ?? baseDescription;

        // Validate title completeness - reject if it looks cut off
        const incompletePatterns = /(\s+(as|the|a|an|to|of|in|on|for|with|and|or|but)\s*)$/i;
        if (!title || title.length < 3 || incompletePatterns.test(title)) {
            console.warn(`[QuestGen] Rejected incomplete title: "${title}", using base: "${baseTitle}"`);
            title = baseTitle;
        }

        // Validate description completeness
        if (!description || description.length < 10) {
            description = baseDescription;
        }

        return { title, description };
    } catch (e) {
        console.error("[QuestGen] JSON parse failed:", e, "raw:", raw);
        return { title: baseTitle, description: baseDescription };
    }
}
