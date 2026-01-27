import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireUser, type AuthedRequest } from "../auth/middleware";

export async function pushRoutes(app: FastifyInstance) {
  app.post("/register", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const Body = z.object({
      token: z.string().min(10),
      platform: z.enum(["ios", "android", "web"]).default("web"),
    });
    const body = Body.parse((req as any).body);

    await prisma.pushToken.upsert({
      where: { token: body.token },
      update: { userId: user.id, platform: body.platform, lastUsedAt: new Date() },
      create: { userId: user.id, token: body.token, platform: body.platform, lastUsedAt: new Date() },
    });

    return { ok: true };
  });
}
