import type { FastifyInstance } from "fastify";
import { requireUser, type AuthedRequest } from "../auth/middleware";
import { prisma } from "../prisma";
import { env } from "../env";
import { stripe } from "../services/stripe/stripe";

export async function billingRoutes(app: FastifyInstance) {
  app.post("/checkout", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    if (!stripe || !env.STRIPE_PRICE_ID_MONTHLY) return reply.code(500).send({ error: "Stripe not configured" });

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

    const customerId =
      sub?.stripeCustomerId ??
      (await stripe.customers
        .create({
          email: user.email ?? undefined,
          metadata: { userId: user.id },
        })
        .then((c) => c.id));

    if (!sub) {
      await prisma.subscription.create({
        data: { userId: user.id, stripeCustomerId: customerId, status: "INACTIVE" },
      });
    } else if (!sub.stripeCustomerId) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: env.STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
      allow_promotion_codes: false,
      success_url: `${env.WEB_BASE_URL}/dashboard/settings?billing=success`,
      cancel_url: `${env.WEB_BASE_URL}/dashboard/settings?billing=cancel`,
    });

    return { url: session.url };
  });

  app.post("/portal", async (req: AuthedRequest, reply) => {
    const user = await requireUser(req);
    if (!stripe) return reply.code(500).send({ error: "Stripe not configured" });

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.stripeCustomerId) return reply.code(400).send({ error: "No Stripe customer" });

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.WEB_BASE_URL}/dashboard/settings`,
    });

    return { url: portal.url };
  });
}
