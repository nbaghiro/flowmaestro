import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Create label input schema
 */
export const createLabelSchema = z.object({
    name: z.string().min(1).describe("Name of the label to create"),
    messageListVisibility: z
        .enum(["show", "hide"])
        .optional()
        .default("show")
        .describe("Whether to show messages with this label in message lists"),
    labelListVisibility: z
        .enum(["labelShow", "labelShowIfUnread", "labelHide"])
        .optional()
        .default("labelShow")
        .describe("Visibility of the label in the label list"),
    backgroundColor: z
        .string()
        .optional()
        .describe("Background color of the label (hex format, e.g., '#4285f4')"),
    textColor: z
        .string()
        .optional()
        .describe("Text color of the label (hex format, e.g., '#ffffff')")
});

export type CreateLabelParams = z.infer<typeof createLabelSchema>;

/**
 * Create label operation definition
 */
export const createLabelOperation: OperationDefinition = {
    id: "createLabel",
    name: "Create Gmail Label",
    description: "Create a new custom label in Gmail",
    category: "labels",
    retryable: true,
    inputSchema: createLabelSchema
};

/**
 * Execute create label operation
 */
export async function executeCreateLabel(
    client: GmailClient,
    params: CreateLabelParams
): Promise<OperationResult> {
    try {
        const labelData: {
            name: string;
            messageListVisibility?: "show" | "hide";
            labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
            color?: {
                textColor?: string;
                backgroundColor?: string;
            };
        } = {
            name: params.name,
            messageListVisibility: params.messageListVisibility,
            labelListVisibility: params.labelListVisibility
        };

        // Add color if specified
        if (params.backgroundColor || params.textColor) {
            labelData.color = {};
            if (params.backgroundColor) {
                labelData.color.backgroundColor = params.backgroundColor;
            }
            if (params.textColor) {
                labelData.color.textColor = params.textColor;
            }
        }

        const result = await client.createLabel(labelData);

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
                message: error instanceof Error ? error.message : "Failed to create label",
                retryable: true
            }
        };
    }
}
