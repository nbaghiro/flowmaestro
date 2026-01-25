import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Add to List Parameters
 */
export const addToListSchema = z.object({
    listId: z.number().describe("The ID of the static list"),
    leadIds: z.array(z.number()).min(1).max(300).describe("Lead IDs to add to the list (max 300)")
});

export type AddToListParams = z.infer<typeof addToListSchema>;

/**
 * Operation Definition
 */
export const addToListOperation: OperationDefinition = {
    id: "addToList",
    name: "Add to List",
    description: "Add leads to a static list in Marketo",
    category: "lists",
    actionType: "write",
    inputSchema: addToListSchema,
    inputSchemaJSON: toJSONSchema(addToListSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Add to List
 */
export async function executeAddToList(
    client: MarketoClient,
    params: AddToListParams
): Promise<OperationResult> {
    try {
        const response = await client.addToList(params.listId, params.leadIds);

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to add leads to list in Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        // Count results
        const results = response.result || [];
        const added = results.filter((r) => r.status === "added").length;
        const memberAlready = results.filter((r) => r.status === "membershipChanged").length;
        const skipped = results.filter((r) => r.status === "skipped").length;

        return {
            success: true,
            data: {
                listId: params.listId,
                results,
                summary: {
                    total: params.leadIds.length,
                    added,
                    memberAlready,
                    skipped
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add leads to list",
                retryable: false
            }
        };
    }
}
