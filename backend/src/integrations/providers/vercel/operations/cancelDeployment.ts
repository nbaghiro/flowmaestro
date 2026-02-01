import { z } from "zod";
import type { VercelDeploymentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const cancelDeploymentSchema = z.object({
    deploymentId: z.string().min(1).describe("Deployment ID to cancel")
});

export type CancelDeploymentParams = z.infer<typeof cancelDeploymentSchema>;

export const cancelDeploymentOperation: OperationDefinition = {
    id: "cancelDeployment",
    name: "Cancel Deployment",
    description: "Cancel a running deployment",
    category: "deployments",
    actionType: "write",
    inputSchema: cancelDeploymentSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCancelDeployment(
    client: VercelClient,
    params: CancelDeploymentParams
): Promise<OperationResult> {
    try {
        const deployment = await client.cancelDeployment(params.deploymentId);

        const formattedDeployment: VercelDeploymentOutput = {
            uid: deployment.uid,
            name: deployment.name,
            url: deployment.url,
            state: deployment.state,
            target: deployment.target || undefined,
            created: deployment.created,
            ready: deployment.ready,
            creator: {
                uid: deployment.creator.uid,
                email: deployment.creator.email,
                username: deployment.creator.username
            },
            inspectorUrl: deployment.inspectorUrl
        };

        return {
            success: true,
            data: {
                deployment: formattedDeployment,
                message: `Deployment ${deployment.uid} canceled successfully`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel deployment",
                retryable: false
            }
        };
    }
}
