import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Update label input schema
 */
export const updateLabelSchema = z.object({
    labelId: z.string().describe("The ID of the label to update"),
    name: z.string().optional().describe("New name for the label"),
    messageListVisibility: z
        .enum(["show", "hide"])
        .optional()
        .describe("Whether to show messages with this label"),
    labelListVisibility: z
        .enum(["labelShow", "labelShowIfUnread", "labelHide"])
        .optional()
        .describe("Visibility of the label in the label list"),
    backgroundColor: z.string().optional().describe("Background color of the label (hex format)"),
    textColor: z.string().optional().describe("Text color of the label (hex format)")
});

export type UpdateLabelParams = z.infer<typeof updateLabelSchema>;

/**
 * Update label operation definition
 */
export const updateLabelOperation: OperationDefinition = {
    id: "updateLabel",
    name: "Update Gmail Label",
    description: "Update an existing Gmail label's name, visibility, or color",
    category: "labels",
    retryable: true,
    inputSchema: updateLabelSchema
};

/**
 * Execute update label operation
 */
export async function executeUpdateLabel(
    client: GmailClient,
    params: UpdateLabelParams
): Promise<OperationResult> {
    try {
        const updateData: {
            name?: string;
            messageListVisibility?: "show" | "hide";
            labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
            color?: {
                textColor?: string;
                backgroundColor?: string;
            };
        } = {};

        if (params.name) {
            updateData.name = params.name;
        }
        if (params.messageListVisibility) {
            updateData.messageListVisibility = params.messageListVisibility;
        }
        if (params.labelListVisibility) {
            updateData.labelListVisibility = params.labelListVisibility;
        }
        if (params.backgroundColor || params.textColor) {
            updateData.color = {};
            if (params.backgroundColor) {
                updateData.color.backgroundColor = params.backgroundColor;
            }
            if (params.textColor) {
                updateData.color.textColor = params.textColor;
            }
        }

        // Validate at least one update is specified
        if (Object.keys(updateData).length === 0) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "At least one field to update must be specified",
                    retryable: false
                }
            };
        }

        const result = await client.updateLabel(params.labelId, updateData);

        return {
            success: true,
            data: {
                labelId: result.id,
                name: result.name,
                type: result.type,
                messageListVisibility: result.messageListVisibility,
                labelListVisibility: result.labelListVisibility,
                color: result.color
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update label",
                retryable: true
            }
        };
    }
}
