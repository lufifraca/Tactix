import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { env } from "../env";
import { encodeS3Key } from "../services/storage";

function imageUrl(key: string) {
  return `${env.S3_PUBLIC_BASE_URL}/${encodeS3Key(key)}`;
}

export async function rewardRoutes(app: FastifyInstance) {
  app.get("/", async (req: AuthedRequest) => {
    const user = await requireUser(req);
    const rewards = await prisma.reward.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    return {
      rewards: rewards.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        caption: r.caption,
        imageUrl: imageUrl(r.assetS3Key),
        isPublic: r.isPublic,
        shareUrl: r.isPublic ? `${env.WEB_BASE_URL}/share/${r.shareId}` : null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  app.post("/:id/share", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    const id = (req.params as any).id as string;
    const reward = await prisma.reward.findFirst({ where: { id, userId: user.id } });
    if (!reward) return reply.code(404).send({ error: "Not found" });

    const updated = await prisma.reward.update({ where: { id: reward.id }, data: { isPublic: true } });
    return { ok: true, shareUrl: `${env.WEB_BASE_URL}/share/${updated.shareId}` };
  });

  app.get("/share/:shareId", async (req: AuthedRequest, reply) => {
    const shareId = (req.params as any).shareId as string;
    const reward = await prisma.reward.findUnique({ where: { shareId } });
    if (!reward) return reply.code(404).send({ error: "Not found" });

    // Private-by-default: if not public, only owner can access.
    if (!reward.isPublic) {
      if (!req.userId) return reply.code(403).send({ error: "Private" });
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user || reward.userId !== user.id) return reply.code(403).send({ error: "Private" });
    }

    return {
      id: reward.id,
      type: reward.type,
      title: reward.title,
      caption: reward.caption,
      imageUrl: imageUrl(reward.assetS3Key),
      createdAt: reward.createdAt.toISOString(),
      isPublic: reward.isPublic,
    };
  });
}
