import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * List workspaces input schema
 */
export const listWorkspacesSchema = z.object({
    filter: z
        .string()
        .optional()
        .describe("OData filter expression (e.g., contains(name,'Sales'))"),
    top: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe("Maximum number of workspaces to return"),
    skip: z.number().int().min(0).optional().describe("Number of workspaces to skip for pagination")
});

export type ListWorkspacesParams = z.infer<typeof listWorkspacesSchema>;

/**
 * List workspaces operation definition
 */
export const listWorkspacesOperation: OperationDefinition = {
    id: "listWorkspaces",
    name: "List Workspaces",
    description: "List all accessible Power BI workspaces (groups)",
    category: "data",
    retryable: true,
    inputSchema: listWorkspacesSchema
};

/**
 * Execute list workspaces operation
 */
export async function executeListWorkspaces(
    client: PowerBIClient,
    params: ListWorkspacesParams
): Promise<OperationResult> {
    try {
        const response = await client.listWorkspaces({
            filter: params.filter,
            top: params.top,
            skip: params.skip
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workspaces",
                retryable: true
            }
        };
    }
}
