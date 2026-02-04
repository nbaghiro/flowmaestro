import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import { PandaDocDocumentIdSchema } from "../schemas";
import type { PandaDocDocumentDetails } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get document details operation schema
 */
export const getDocumentSchema = z.object({
    documentId: PandaDocDocumentIdSchema
});

export type GetDocumentParams = z.infer<typeof getDocumentSchema>;

/**
 * Get document details operation definition
 */
export const getDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getDocument",
            name: "Get Document",
            description: "Get full document details including fields, tokens, and recipients",
            category: "documents",
            inputSchema: getDocumentSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create getDocumentOperation"
        );
        throw new Error(
            `Failed to create getDocument operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get document operation
 */
export async function executeGetDocument(
    client: PandaDocClient,
    params: GetDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.getDocument(params.documentId)) as PandaDocDocumentDetails;

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                status: response.status,
                dateCreated: response.date_created,
                dateModified: response.date_modified,
                expirationDate: response.expiration_date,
                recipients: response.recipients || [],
                fields: response.fields || [],
                tokens: response.tokens || [],
                metadata: response.metadata || {},
                tags: response.tags || [],
                createdBy: response.created_by
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get document details",
                retryable: true
            }
        };
    }
}
