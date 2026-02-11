import { FastifyInstance } from "fastify";
import { PaymentHistoryRepository } from "../../../storage/repositories/PaymentHistoryRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

export async function paymentHistoryRoute(fastify: FastifyInstance) {
    /**
     * GET /billing/payment-history
     *
     * Get payment history for a workspace.
     */
    fastify.get<{
        Querystring: { workspaceId: string; limit?: number; offset?: number };
    }>(
        "/payment-history",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("view_billing")
            ]
        },
        async (request, reply) => {
            const workspaceId = request.workspace!.id;
            const { limit = 20, offset = 0 } = request.query;

            const paymentHistoryRepo = new PaymentHistoryRepository();
            const payments = await paymentHistoryRepo.findByWorkspaceId(workspaceId, {
                limit,
                offset
            });

            return reply.send({
                success: true,
                data: payments.map((p) => paymentHistoryRepo.toShared(p))
            });
        }
    );
}
