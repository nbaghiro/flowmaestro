import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Update Trigger operation schema
 */
export const updateTriggerSchema = z.object({
    triggerId: z.string().describe("Build trigger ID"),
    name: z.string().min(1).max(64).optional().describe("New trigger name"),
    description: z.string().optional().describe("New description"),
    disabled: z.boolean().optional().describe("Enable or disable trigger"),
    filename: z.string().optional().describe("Path to cloudbuild.yaml"),
    substitutions: z.record(z.string()).optional().describe("Substitution variables")
});

export type UpdateTriggerParams = z.infer<typeof updateTriggerSchema>;

/**
 * Update Trigger operation definition
 */
export const updateTriggerOperation: OperationDefinition = {
    id: "cloud_build_updateTrigger",
    name: "Update Trigger",
    description: "Update an existing build trigger configuration",
    category: "cloud-build",
    inputSchema: updateTriggerSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update trigger operation
 */
export async function executeUpdateTrigger(
    client: GoogleCloudClient,
    params: UpdateTriggerParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.name) {
            requestBody.name = params.name;
        }

        if (params.description !== undefined) {
            requestBody.description = params.description;
        }

        if (params.disabled !== undefined) {
            requestBody.disabled = params.disabled;
        }

        if (params.filename) {
            requestBody.filename = params.filename;
        }

        if (params.substitutions) {
            requestBody.substitutions = params.substitutions;
        }

        const response = await client.cloudBuild.patch<{
            id: string;
            name: string;
            description?: string;
            disabled: boolean;
            createTime: string;
        }>(`/projects/${client.projectId}/triggers/${params.triggerId}`, requestBody);

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                description: response.description,
                disabled: response.disabled,
                createTime: response.createTime,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update trigger",
                retryable: false
            }
        };
    }
}
