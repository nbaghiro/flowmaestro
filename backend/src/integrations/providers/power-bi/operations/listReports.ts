import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * List reports input schema
 */
export const listReportsSchema = z.object({
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, lists reports from 'My Workspace'")
});

export type ListReportsParams = z.infer<typeof listReportsSchema>;

/**
 * List reports operation definition
 */
export const listReportsOperation: OperationDefinition = {
    id: "listReports",
    name: "List Reports",
    description: "List all reports in a workspace",
    category: "data",
    retryable: true,
    inputSchema: listReportsSchema
};

/**
 * Execute list reports operation
 */
export async function executeListReports(
    client: PowerBIClient,
    params: ListReportsParams
): Promise<OperationResult> {
    try {
        const response = await client.listReports(params.workspaceId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list reports",
                retryable: true
            }
        };
    }
}
