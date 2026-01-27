import { prisma } from "../src/prisma";
import { ingestUserAll } from "../src/services/ingest/ingestOrchestrator";

async function main() {
    const users = await prisma.user.findMany();
    for (const u of users) {
        console.log(`Ingesting for ${u.displayName}...`);
        const res = await ingestUserAll(u.id);
        console.log(JSON.stringify(res, null, 2));
    }
}
main();
