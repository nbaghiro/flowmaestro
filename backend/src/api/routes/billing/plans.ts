import { FastifyInstance } from "fastify";
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from "@flowmaestro/shared";

export async function plansRoute(fastify: FastifyInstance) {
    /**
     * GET /billing/plans
     *
     * Get available subscription plans and credit packs.
     * Public route (no auth required) for displaying pricing.
     */
    fastify.get("/plans", async (_request, reply) => {
        return reply.send({
            success: true,
            data: {
                subscriptionPlans: Object.values(SUBSCRIPTION_PLANS),
                creditPacks: CREDIT_PACKS
            }
        });
    });
}
