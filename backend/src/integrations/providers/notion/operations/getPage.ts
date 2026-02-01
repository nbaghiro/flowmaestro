import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { NotionClient } from "../client/NotionClient";

/**
 * Get page input schema
 */
export const getPageSchema = z.object({
    page_id: z.string().min(1).describe("Page ID to retrieve")
});

export type GetPageParams = z.infer<typeof getPageSchema>;

/**
 * Get page operation definition
 */
export const getPageOperation: OperationDefinition = {
    id: "getPage",
    name: "Get Page",
    description: "Retrieve a Notion page by ID",
    category: "read",
    retryable: true,
    inputSchema: getPageSchema
};

/**
 * Execute get page operation
 */
export async function executeGetPage(
    client: NotionClient,
    params: GetPageParams
): Promise<OperationResult> {
    try {
        const response = await client.getPage(params.page_id);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Notion page",
                retryable: true
            }
        };
    }
}
