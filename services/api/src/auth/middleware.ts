import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { prisma } from "../prisma";
import { verifySessionToken } from "./jwt";

export type AuthedRequest = FastifyRequest & { userId?: string };

export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("userId", null);

  app.addHook("preHandler", async (req: AuthedRequest) => {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const cookieToken = (req.cookies as any)?.tx_session as string | undefined;
    const token = bearer ?? cookieToken;

    if (!token) return;

    const decoded = verifySessionToken(token);
    if (!decoded) return;

    req.userId = decoded.sub;
  });
});

export async function requireUser(req: AuthedRequest) {
  if (!req.userId) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    const err: any = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return user;
}

