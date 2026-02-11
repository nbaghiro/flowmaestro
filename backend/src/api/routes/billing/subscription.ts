import { FastifyInstance } from "fastify";
import type { SubscriptionDetails } from "@flowmaestro/shared";
import { SUBSCRIPTION_PLANS } from "@flowmaestro/shared";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

export async function subscriptionRoute(fastify: FastifyInstance) {
    /**
     * GET /billing/subscription
     *
     * Get current subscription status for a workspace.
     */
    fastify.get<{
        Querystring: { workspaceId: string };
    }>(
        "/subscription",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("view_billing")
            ]
        },
        async (request, reply) => {
            const workspaceId = request.workspace!.id;
            const userId = request.user!.id;

            const workspaceRepo = new WorkspaceRepository();
            const userRepo = new UserRepository();

            const workspace = await workspaceRepo.findById(workspaceId);
            if (!workspace) {
                return reply.status(404).send({
                    success: false,
                    error: "Workspace not found"
                });
            }

            const user = await userRepo.findById(userId);
            const plan = SUBSCRIPTION_PLANS[workspace.type];

            const subscriptionDetails: SubscriptionDetails = {
                status: workspace.subscription_status,
                planSlug: workspace.type,
                planName: plan.name,
                currentPeriodStart:
                    workspace.subscription_current_period_start?.toISOString() || null,
                currentPeriodEnd: workspace.subscription_current_period_end?.toISOString() || null,
                trialEnd: workspace.subscription_trial_end?.toISOString() || null,
                cancelAtPeriodEnd: workspace.subscription_cancel_at_period_end,
                stripeSubscriptionId: workspace.stripe_subscription_id,
                stripeCustomerId: user?.stripe_customer_id || null
            };

            return reply.send({
                success: true,
                data: subscriptionDetails
            });
        }
    );
}
