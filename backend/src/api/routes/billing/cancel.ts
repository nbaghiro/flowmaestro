import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { stripeService } from "../../../services/stripe";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("BillingCancelRoute");

export async function cancelRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/cancel
     *
     * Cancel a subscription (at period end by default).
     */
    fastify.post<{
        Querystring: { workspaceId: string };
        Body: { immediate?: boolean };
    }>(
        "/cancel",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("manage_billing")
            ]
        },
        async (request, reply) => {
            const workspaceId = request.workspace!.id;
            const userId = request.user!.id;
            const { immediate = false } = request.body || {};

            try {
                const workspaceRepo = new WorkspaceRepository();
                const workspace = await workspaceRepo.findById(workspaceId);

                if (!workspace) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workspace not found"
                    });
                }

                if (!workspace.stripe_subscription_id) {
                    return reply.status(400).send({
                        success: false,
                        error: "No active subscription found"
                    });
                }

                await stripeService.cancelSubscription(
                    workspace.stripe_subscription_id,
                    !immediate
                );

                // Update workspace to reflect cancellation
                await workspaceRepo.update(workspaceId, {
                    subscription_cancel_at_period_end: !immediate
                });

                if (immediate) {
                    // If immediate, the webhook will handle downgrade
                    // But update status now for responsiveness
                    await workspaceRepo.update(workspaceId, {
                        subscription_status: "canceled"
                    });
                }

                logger.info(
                    { workspaceId, userId, immediate },
                    "Subscription cancellation initiated"
                );

                return reply.send({
                    success: true,
                    data: {
                        cancelAtPeriodEnd: !immediate,
                        message: immediate
                            ? "Subscription canceled immediately"
                            : "Subscription will cancel at the end of the billing period"
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, userId, error }, "Error canceling subscription");

                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to cancel subscription"
                });
            }
        }
    );
}
