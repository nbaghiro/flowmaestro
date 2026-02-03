import { z } from "zod";
import { AppIdSchema, DeploymentIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get Deployment Logs operation schema
 */
export const getDeploymentLogsSchema = z.object({
    appId: AppIdSchema,
    deploymentId: DeploymentIdSchema,
    componentName: z.string().min(1).describe("The name of the component to get logs for"),
    type: z.enum(["BUILD", "DEPLOY", "RUN"]).optional().describe("The type of logs to retrieve"),
    follow: z.boolean().optional().describe("Whether to stream logs in real-time")
});

export type GetDeploymentLogsParams = z.infer<typeof getDeploymentLogsSchema>;

/**
 * Get Deployment Logs operation definition
 */
export const getDeploymentLogsOperation: OperationDefinition = {
    id: "apps_getDeploymentLogs",
    name: "Get Deployment Logs",
    description: "Get logs for a specific deployment component",
    category: "apps",
    inputSchema: getDeploymentLogsSchema,
    retryable: true,
    timeout: 60000
};

/**
 * Execute get deployment logs operation
 */
export async function executeGetDeploymentLogs(
    client: DigitalOceanClient,
    params: GetDeploymentLogsParams
): Promise<OperationResult> {
    try {
        const { appId, deploymentId, componentName, type, follow } = params;
        const response = await client.getDeploymentLogs(appId, deploymentId, componentName, {
            type,
            follow
        });

        return {
            success: true,
            data: {
                appId,
                deploymentId,
                componentName,
                liveUrl: response.live_url,
                url: response.url,
                historicUrls: response.historic_urls
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get deployment logs",
                retryable: true
            }
        };
    }
}
