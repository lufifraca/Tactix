import { prisma } from "../src/prisma";
import { upsertDailySkillScores, computeCrossGameSkillScores } from "../src/services/skills/scoring";

async function main() {
    const users = await prisma.user.findMany({ select: { id: true } });
    console.log(`Found ${users.length} users.`);

    for (const u of users) {
        console.log(`Recomputing for ${u.id}...`);
        const scores = await computeCrossGameSkillScores(u.id, "ALL");
        console.log("Computed scores:", scores.map(s => `${s.domain}: ${s.score}`));

        await upsertDailySkillScores(u.id, new Date().toISOString().slice(0, 10));
        console.log("Upserted.");

        const verify = await prisma.skillScore.findMany({
            where: { userId: u.id, game: null },
            orderBy: { computedAt: "desc" },
            take: 7,
        });
        console.log("Verification from DB:", verify.map(s => s.domain));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
