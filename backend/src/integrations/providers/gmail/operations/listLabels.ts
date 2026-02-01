import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * List labels input schema (no parameters required)
 */
export const listLabelsSchema = z.object({});

export type ListLabelsParams = z.infer<typeof listLabelsSchema>;

/**
 * List labels operation definition
 */
export const listLabelsOperation: OperationDefinition = {
    id: "listLabels",
    name: "List Gmail Labels",
    description:
        "List all labels in the user's Gmail account including system labels (INBOX, SENT, etc.) and custom labels",
    category: "labels",
    retryable: true,
    inputSchema: listLabelsSchema
};

/**
 * Execute list labels operation
 */
export async function executeListLabels(
    client: GmailClient,
    _params: ListLabelsParams
): Promise<OperationResult> {
    try {
        const response = await client.listLabels();

        // Separate system labels and user labels for easier use
        const systemLabels = response.labels.filter((l) => l.type === "system");
        const userLabels = response.labels.filter((l) => l.type === "user");

        return {
            success: true,
            data: {
                labels: response.labels,
                systemLabels,
                userLabels,
                total: response.labels.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list labels",
                retryable: true
            }
        };
    }
}
