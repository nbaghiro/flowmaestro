import { FastifyInstance } from "fastify";
import type { WorkspaceType } from "@flowmaestro/shared";
import { WORKSPACE_LIMITS } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { WorkspaceCreditRepository } from "../../../storage/repositories/WorkspaceCreditRepository";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("WorkspaceUpgradeRoutes");

interface UpgradeWorkspaceBody {
    plan: WorkspaceType;
}

export async function upgradeWorkspaceRoute(fastify: FastifyInstance) {
    /**
     * POST /workspaces/:workspaceId/upgrade
     *
     * Upgrade a workspace to a new plan.
     * For now, this is a simple plan change without Stripe integration.
     * In production, this would create a Stripe checkout session.
     */
    fastify.post<{
        Params: { workspaceId: string };
        Body: UpgradeWorkspaceBody;
    }>(
        "/:workspaceId/upgrade",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("upgrade")]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const { plan } = request.body;
            const userId = request.user!.id;

            try {
                // Validate plan
                const validPlans: WorkspaceType[] = ["free", "pro", "team"];
                if (!validPlans.includes(plan)) {
                    return reply.status(400).send({
                        success: false,
                        error: `Invalid plan. Must be one of: ${validPlans.join(", ")}`
                    });
                }

                const workspaceRepo = new WorkspaceRepository();
                const creditRepo = new WorkspaceCreditRepository();

                // Get current workspace
                const workspace = await workspaceRepo.findById(workspaceId);
                if (!workspace) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workspace not found"
                    });
                }

                // Check if already on this plan
                if (workspace.type === plan) {
                    return reply.status(400).send({
                        success: false,
                        error: `Workspace is already on the ${plan} plan`
                    });
                }

                // Get new plan limits
                const newLimits = WORKSPACE_LIMITS[plan];

                // Update workspace with new plan and limits
                const updatedWorkspace = await workspaceRepo.update(workspaceId, {
                    type: plan,
                    max_workflows: newLimits.max_workflows,
                    max_agents: newLimits.max_agents,
                    max_knowledge_bases: newLimits.max_knowledge_bases,
                    max_kb_chunks: newLimits.max_kb_chunks,
                    max_members: newLimits.max_members,
                    max_connections: newLimits.max_connections,
                    execution_history_days: newLimits.execution_history_days
                });

                if (!updatedWorkspace) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to update workspace"
                    });
                }

                // Add bonus credits for upgrade (pro: 2500, team: 10000)
                if (plan !== "free") {
                    const bonusCredits = newLimits.monthly_credits;

                    // Get current balance for transaction logging
                    const currentBalance = await creditRepo.getBalance(workspaceId);
                    const balanceBefore = currentBalance
                        ? currentBalance.subscription +
                          currentBalance.purchased +
                          currentBalance.bonus
                        : 0;

                    // Add bonus credits
                    await creditRepo.addBonusCredits(workspaceId, bonusCredits);

                    // Log the transaction
                    await creditRepo.createTransaction({
                        workspace_id: workspaceId,
                        user_id: userId,
                        amount: bonusCredits,
                        balance_before: balanceBefore,
                        balance_after: balanceBefore + bonusCredits,
                        transaction_type: "bonus",
                        description: `Upgrade to ${plan} plan - ${bonusCredits} bonus credits`
                    });
                }

                logger.info(
                    {
                        workspaceId,
                        userId,
                        previousPlan: workspace.type,
                        newPlan: plan
                    },
                    "Workspace upgraded"
                );

                return reply.send({
                    success: true,
                    data: {
                        id: updatedWorkspace.id,
                        name: updatedWorkspace.name,
                        type: updatedWorkspace.type,
                        limits: {
                            maxWorkflows: updatedWorkspace.max_workflows,
                            maxAgents: updatedWorkspace.max_agents,
                            maxKnowledgeBases: updatedWorkspace.max_knowledge_bases,
                            maxKbChunks: updatedWorkspace.max_kb_chunks,
                            maxMembers: updatedWorkspace.max_members,
                            maxConnections: updatedWorkspace.max_connections,
                            executionHistoryDays: updatedWorkspace.execution_history_days
                        }
                    },
                    message: `Successfully upgraded to ${plan} plan`
                });
            } catch (error) {
                logger.error({ workspaceId, plan, error }, "Error upgrading workspace");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
