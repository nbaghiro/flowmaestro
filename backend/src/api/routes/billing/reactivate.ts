import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { stripeService } from "../../../services/stripe";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("BillingReactivateRoute");

export async function reactivateRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/reactivate
     *
     * Reactivate a subscription that was set to cancel at period end.
     */
    fastify.post<{
        Querystring: { workspaceId: string };
    }>(
        "/reactivate",
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
                        error: "No subscription found"
                    });
                }

                if (!workspace.subscription_cancel_at_period_end) {
                    return reply.status(400).send({
                        success: false,
                        error: "Subscription is not set to cancel"
                    });
                }

                await stripeService.reactivateSubscription(workspace.stripe_subscription_id);

                // Update workspace
                await workspaceRepo.update(workspaceId, {
                    subscription_cancel_at_period_end: false
                });

                logger.info({ workspaceId, userId }, "Subscription reactivated");

                return reply.send({
                    success: true,
                    data: {
                        message: "Subscription reactivated successfully"
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, userId, error }, "Error reactivating subscription");

                return reply.status(500).send({
                    success: false,
                    error:
                        error instanceof Error ? error.message : "Failed to reactivate subscription"
                });
            }
        }
    );
}
