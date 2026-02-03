import { z } from "zod";
import { AppIdSchema, DeploymentIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Rollback Deployment operation schema
 */
export const rollbackDeploymentSchema = z.object({
    appId: AppIdSchema,
    deploymentId: DeploymentIdSchema.describe("The deployment ID to rollback to")
});

export type RollbackDeploymentParams = z.infer<typeof rollbackDeploymentSchema>;

/**
 * Rollback Deployment operation definition
 */
export const rollbackDeploymentOperation: OperationDefinition = {
    id: "apps_rollbackDeployment",
    name: "Rollback Deployment",
    description: "Rollback an app to a previous deployment",
    category: "apps",
    inputSchema: rollbackDeploymentSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute rollback deployment operation
 */
export async function executeRollbackDeployment(
    client: DigitalOceanClient,
    params: RollbackDeploymentParams
): Promise<OperationResult> {
    try {
        const deployment = await client.rollbackDeployment(params.appId, params.deploymentId);

        return {
            success: true,
            data: {
                id: deployment.id,
                appId: params.appId,
                rolledBackFrom: params.deploymentId,
                phase: deployment.phase,
                cause: deployment.cause,
                createdAt: deployment.created_at,
                message: "Rollback initiated successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to rollback deployment",
                retryable: false
            }
        };
    }
}
