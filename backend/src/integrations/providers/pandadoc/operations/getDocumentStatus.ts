import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import { PandaDocDocumentIdSchema } from "../schemas";
import type { PandaDocDocument } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get document status operation schema
 */
export const getDocumentStatusSchema = z.object({
    documentId: PandaDocDocumentIdSchema
});

export type GetDocumentStatusParams = z.infer<typeof getDocumentStatusSchema>;

/**
 * Get document status operation definition
 */
export const getDocumentStatusOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getDocumentStatus",
            name: "Get Document Status",
            description: "Get document status (lightweight check without full details)",
            category: "documents",
            inputSchema: getDocumentStatusSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create getDocumentStatusOperation"
        );
        throw new Error(
            `Failed to create getDocumentStatus operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get document status operation
 */
export async function executeGetDocumentStatus(
    client: PandaDocClient,
    params: GetDocumentStatusParams
): Promise<OperationResult> {
    try {
        const response = (await client.getDocumentStatus(params.documentId)) as PandaDocDocument;

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                status: response.status,
                dateCreated: response.date_created,
                dateModified: response.date_modified
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get document status",
                retryable: true
            }
        };
    }
}
