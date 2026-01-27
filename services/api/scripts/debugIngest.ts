import { prisma } from "../src/prisma";
import { ingestUserAll } from "../src/services/ingest/ingestOrchestrator";

async function main() {
    try {
        const users = await prisma.user.findMany();
        for (const u of users) {
            console.log(`Ingesting for ${u.displayName} (${u.id})...`);
            const res = await ingestUserAll(u.id);
            console.log("Result:", JSON.stringify(res, null, 2));
        }
    } catch (e: any) {
        console.error("CRITICAL ERROR:");
        console.error(e.message);
        if (e.code) console.error("Code:", e.code);
        if (e.meta) console.error("Meta:", e.meta);
    } finally {
        await prisma.$disconnect();
    }
}

main();
