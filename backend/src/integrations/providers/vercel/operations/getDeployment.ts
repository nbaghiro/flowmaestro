import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { VercelDeploymentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const getDeploymentSchema = z.object({
    deploymentId: z.string().min(1).describe("Deployment ID or URL")
});

export type GetDeploymentParams = z.infer<typeof getDeploymentSchema>;

export const getDeploymentOperation: OperationDefinition = {
    id: "getDeployment",
    name: "Get Deployment",
    description: "Get details of a specific deployment by ID or URL",
    category: "deployments",
    inputSchema: getDeploymentSchema,
    inputSchemaJSON: toJSONSchema(getDeploymentSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetDeployment(
    client: VercelClient,
    params: GetDeploymentParams
): Promise<OperationResult> {
    try {
        const deployment = await client.getDeployment(params.deploymentId);

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
                deployment: formattedDeployment
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get deployment",
                retryable: true
            }
        };
    }
}
