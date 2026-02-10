import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Trigger operation schema
 */
export const getTriggerSchema = z.object({
    triggerId: z.string().describe("Build trigger ID")
});

export type GetTriggerParams = z.infer<typeof getTriggerSchema>;

/**
 * Get Trigger operation definition
 */
export const getTriggerOperation: OperationDefinition = {
    id: "cloud_build_getTrigger",
    name: "Get Trigger",
    description: "Get detailed information about a specific build trigger",
    category: "cloud-build",
    inputSchema: getTriggerSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get trigger operation
 */
export async function executeGetTrigger(
    client: GoogleCloudClient,
    params: GetTriggerParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudBuild.get<{
            id: string;
            name: string;
            description?: string;
            disabled: boolean;
            createTime: string;
            github?: {
                owner: string;
                name: string;
                push?: { branch: string };
                pullRequest?: { branch: string };
            };
            filename?: string;
            build?: {
                steps: Array<{
                    name: string;
                    args?: string[];
                }>;
            };
            substitutions?: Record<string, string>;
        }>(`/projects/${client.projectId}/triggers/${params.triggerId}`);

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                description: response.description,
                disabled: response.disabled,
                createTime: response.createTime,
                github: response.github,
                filename: response.filename,
                build: response.build,
                substitutions: response.substitutions,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get trigger",
                retryable: true
            }
        };
    }
}
