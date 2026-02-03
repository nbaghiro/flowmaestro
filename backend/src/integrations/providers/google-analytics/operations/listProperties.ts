import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleAnalyticsClient } from "../client/GoogleAnalyticsClient";

/**
 * List properties input schema
 */
export const listPropertiesSchema = z.object({
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(50)
        .describe("Maximum number of properties to return (1-200, default: 50)"),
    pageToken: z.string().optional().describe("Page token for pagination"),
    filter: z
        .string()
        .optional()
        .describe("Filter expression to filter properties (e.g., parent:accounts/123456)")
});

export type ListPropertiesParams = z.infer<typeof listPropertiesSchema>;

/**
 * List properties operation definition
 */
export const listPropertiesOperation: OperationDefinition = {
    id: "listProperties",
    name: "List Properties",
    description: "List all accessible GA4 properties",
    category: "data",
    retryable: true,
    inputSchema: listPropertiesSchema
};

/**
 * Execute list properties operation
 */
export async function executeListProperties(
    client: GoogleAnalyticsClient,
    params: ListPropertiesParams
): Promise<OperationResult> {
    try {
        const response = await client.listProperties({
            pageSize: params.pageSize,
            pageToken: params.pageToken,
            filter: params.filter
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
                message: error instanceof Error ? error.message : "Failed to list properties",
                retryable: true
            }
        };
    }
}
