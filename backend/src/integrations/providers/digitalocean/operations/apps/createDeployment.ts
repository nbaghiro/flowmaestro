import { z } from "zod";
import { AppIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Create Deployment operation schema
 */
export const createDeploymentSchema = z.object({
    appId: AppIdSchema,
    force_build: z.boolean().optional().describe("Force a rebuild even if no changes detected")
});

export type CreateDeploymentParams = z.infer<typeof createDeploymentSchema>;

/**
 * Create Deployment operation definition
 */
export const createDeploymentOperation: OperationDefinition = {
    id: "apps_createDeployment",
    name: "Create Deployment",
    description: "Trigger a new deployment for an App Platform app",
    category: "apps",
    inputSchema: createDeploymentSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create deployment operation
 */
export async function executeCreateDeployment(
    client: DigitalOceanClient,
    params: CreateDeploymentParams
): Promise<OperationResult> {
    try {
        const { appId, ...deployParams } = params;
        const deployment = await client.createDeployment(appId, deployParams);

        return {
            success: true,
            data: {
                id: deployment.id,
                appId,
                phase: deployment.phase,
                phaseLastUpdatedAt: deployment.phase_last_updated_at,
                cause: deployment.cause,
                progress: deployment.progress,
                createdAt: deployment.created_at,
                message: "Deployment triggered successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create deployment",
                retryable: false
            }
        };
    }
}
