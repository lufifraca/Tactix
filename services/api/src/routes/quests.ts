import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { prisma } from "../prisma";
import { recomputeQuestProgress } from "../services/quests/questEngine";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function questRoutes(app: FastifyInstance) {
  app.get("/today", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const dateStr = todayUtc();
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const quests = await prisma.quest.findMany({ where: { userId: user.id, date }, orderBy: { slot: "asc" } });
    return { date: dateStr, quests };
  });

  app.post("/recompute", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Body = z.object({ date: z.string().optional() });
    const body = Body.parse((req as any).body);
    const dateStr = body.date ?? todayUtc();
    await recomputeQuestProgress(user.id, dateStr);
    return { ok: true };
  });

  app.get("/:id", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    const id = (req.params as any).id as string;
    const quest = await prisma.quest.findFirst({ where: { id, userId: user.id } });
    if (!quest) return reply.code(404).send({ error: "Not found" });
    return { quest };
  });
}
