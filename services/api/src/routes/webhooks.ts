import type { FastifyInstance } from "fastify";
import { env } from "../env";
import { stripe } from "../services/stripe/stripe";
import { prisma } from "../prisma";

export async function webhookRoutes(app: FastifyInstance) {
  app.post(
    "/stripe",
    { config: { rawBody: true } as any },
    async (req, reply) => {
      if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return reply.code(500).send({ error: "Stripe not configured" });

      const sig = req.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") return reply.code(400).send({ error: "Missing signature" });

      const rawBody = (req as any).rawBody as string | undefined;
      if (!rawBody) return reply.code(400).send({ error: "Missing raw body" });

      let event: any;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (e: any) {
        req.log.error({ e }, "stripe webhook signature verification failed");
        return reply.code(400).send({ error: "Bad signature" });
      }

      const type = event.type as string;

      if (type.startsWith("customer.subscription.")) {
        const sub = event.data.object as any; // Stripe.Subscription
        const customerId = sub.customer as string;
        const status = sub.status as string;

        const mapped =
          status === "active"
            ? "ACTIVE"
            : status === "past_due"
              ? "PAST_DUE"
              : status === "canceled" || status === "unpaid"
                ? "CANCELED"
                : "INACTIVE";

        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

        const record = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
        if (record) {
          await prisma.subscription.update({
            where: { id: record.id },
            data: {
              stripeSubscriptionId: sub.id,
              status: mapped as any,
              currentPeriodEnd,
            },
          });
        }
      }

      // You can extend with invoice.payment_failed, etc.
      reply.send({ received: true });
    }
  );
}
