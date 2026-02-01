import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * Get issue input schema
 */
export const getIssueSchema = z.object({
    id: z.string().min(1).describe("Issue ID to retrieve")
});

export type GetIssueParams = z.infer<typeof getIssueSchema>;

/**
 * Get issue operation definition
 */
export const getIssueOperation: OperationDefinition = {
    id: "getIssue",
    name: "Get Issue",
    description: "Get a single issue by ID from Linear",
    category: "issues",
    retryable: true,
    inputSchema: getIssueSchema
};

/**
 * Execute get issue operation
 */
export async function executeGetIssue(
    client: LinearClient,
    params: GetIssueParams
): Promise<OperationResult> {
    try {
        const response = await client.getIssue(params.id);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Linear issue",
                retryable: true
            }
        };
    }
}
