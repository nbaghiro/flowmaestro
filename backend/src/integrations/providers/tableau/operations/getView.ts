import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import { TableauViewIdSchema } from "./schemas";
import type { TableauView } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get View operation schema
 */
export const getViewSchema = z.object({
    view_id: TableauViewIdSchema
});

export type GetViewParams = z.infer<typeof getViewSchema>;

/**
 * Get View operation definition
 */
export const getViewOperation: OperationDefinition = {
    id: "getView",
    name: "Get View",
    description: "Get view details by ID",
    category: "views",
    inputSchema: getViewSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get view operation
 */
export async function executeGetView(
    client: TableauClient,
    params: GetViewParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ view: TableauView }>(
            client.makeSitePath(`/views/${params.view_id}`)
        );

        return {
            success: true,
            data: response.view
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get view",
                retryable: true
            }
        };
    }
}
