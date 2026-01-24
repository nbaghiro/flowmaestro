import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";

/**
 * Delete Opportunity Parameters
 */
export const deleteOpportunitySchema = z.object({
    id: z.string().describe("The opportunity ID to delete (starts with 'oppo_')")
});

export type DeleteOpportunityParams = z.infer<typeof deleteOpportunitySchema>;

/**
 * Operation Definition
 */
export const deleteOpportunityOperation: OperationDefinition = {
    id: "deleteOpportunity",
    name: "Delete Opportunity",
    description: "Delete an opportunity",
    category: "opportunities",
    inputSchema: deleteOpportunitySchema,
    inputSchemaJSON: toJSONSchema(deleteOpportunitySchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Opportunity
 */
export async function executeDeleteOpportunity(
    client: CloseClient,
    params: DeleteOpportunityParams
): Promise<OperationResult> {
    try {
        await client.delete(`/opportunity/${params.id}/`);

        return {
            success: true,
            data: { deleted: true, id: params.id }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete opportunity",
                retryable: false
            }
        };
    }
}
