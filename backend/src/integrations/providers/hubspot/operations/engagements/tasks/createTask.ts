import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Create Task Parameters
 */
export const createTaskSchema = z.object({
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    associations: z
        .array(
            z.object({
                to: z.object({ id: z.string() }),
                types: z.array(
                    z.object({
                        associationCategory: z.string(),
                        associationTypeId: z.number()
                    })
                )
            })
        )
        .optional()
});

export type CreateTaskParams = z.infer<typeof createTaskSchema>;

/**
 * Operation Definition
 */
export const createTaskOperation: OperationDefinition = {
    id: "createTask",
    name: "Create Task",
    description: "Create a new task engagement in HubSpot CRM",
    category: "crm",
    inputSchema: createTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Task
 */
export async function executeCreateTask(
    client: HubspotClient,
    params: CreateTaskParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotEngagement>("/crm/v3/objects/tasks", {
            properties: params.properties,
            associations: params.associations
        });

        return { success: true, data: response };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create task",
                retryable: false
            }
        };
    }
}
