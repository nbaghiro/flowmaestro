import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * List workflow states input schema
 */
export const listWorkflowStatesSchema = z.object({
    teamId: z.string().min(1).describe("Team ID to get workflow states for")
});

export type ListWorkflowStatesParams = z.infer<typeof listWorkflowStatesSchema>;

/**
 * List workflow states operation definition
 */
export const listWorkflowStatesOperation: OperationDefinition = {
    id: "listWorkflowStates",
    name: "List Workflow States",
    description: "List workflow states for a specific team in Linear",
    category: "teams",
    retryable: true,
    inputSchema: listWorkflowStatesSchema
};

/**
 * Execute list workflow states operation
 */
export async function executeListWorkflowStates(
    client: LinearClient,
    params: ListWorkflowStatesParams
): Promise<OperationResult> {
    try {
        const response = await client.listWorkflowStates(params.teamId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to list Linear workflow states",
                retryable: true
            }
        };
    }
}
