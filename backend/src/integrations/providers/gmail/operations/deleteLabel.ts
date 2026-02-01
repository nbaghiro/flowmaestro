import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Delete label input schema
 */
export const deleteLabelSchema = z.object({
    labelId: z.string().describe("The ID of the label to delete (cannot delete system labels)")
});

export type DeleteLabelParams = z.infer<typeof deleteLabelSchema>;

/**
 * Delete label operation definition
 */
export const deleteLabelOperation: OperationDefinition = {
    id: "deleteLabel",
    name: "Delete Gmail Label",
    description: "Delete a custom Gmail label (system labels like INBOX, SENT cannot be deleted)",
    category: "labels",
    retryable: true,
    inputSchema: deleteLabelSchema
};

/**
 * Execute delete label operation
 */
export async function executeDeleteLabel(
    client: GmailClient,
    params: DeleteLabelParams
): Promise<OperationResult> {
    try {
        // Check if trying to delete a system label
        const systemLabels = [
            "INBOX",
            "SENT",
            "TRASH",
            "SPAM",
            "DRAFT",
            "STARRED",
            "UNREAD",
            "IMPORTANT",
            "CATEGORY_PERSONAL",
            "CATEGORY_SOCIAL",
            "CATEGORY_PROMOTIONS",
            "CATEGORY_UPDATES",
            "CATEGORY_FORUMS"
        ];

        if (systemLabels.includes(params.labelId)) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Cannot delete system labels",
                    retryable: false
                }
            };
        }

        await client.deleteLabel(params.labelId);

        return {
            success: true,
            data: {
                labelId: params.labelId,
                deleted: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete label",
                retryable: true
            }
        };
    }
}
