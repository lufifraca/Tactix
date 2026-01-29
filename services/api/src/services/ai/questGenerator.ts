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
                max_tokens: 150,
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
    
    Output JSON only: { "title": "...", "description": "..." }
  `;

    const raw = await chatCompletion("Output valid JSON only.", prompt);
    if (!raw) return { title: baseTitle, description: baseDescription };

    try {
        const parsed = JSON.parse(raw.replace(/```json/g, "").replace(/```/g, ""));
        return {
            title: parsed.title?.slice(0, 60) ?? baseTitle,
            description: parsed.description?.slice(0, 150) ?? baseDescription,
        };
    } catch {
        return { title: baseTitle, description: baseDescription };
    }
}
