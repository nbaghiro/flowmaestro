import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import type { PandaDocListDocumentsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List documents operation schema
 */
export const listDocumentsSchema = z.object({
    q: z.string().optional().describe("Search query (document name)"),
    status: z
        .number()
        .optional()
        .describe("Filter by status code (0=draft, 1=sent, 2=completed, etc.)"),
    count: z.number().min(1).max(100).default(50).describe("Results per page (max 100)"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    tag: z.string().optional().describe("Filter by tag"),
    orderBy: z
        .string()
        .optional()
        .describe("Sort field (e.g., 'date_status_changed', 'name', 'date_created')")
});

export type ListDocumentsParams = z.infer<typeof listDocumentsSchema>;

/**
 * List documents operation definition
 */
export const listDocumentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listDocuments",
            name: "List Documents",
            description: "List documents in your PandaDoc account with optional filtering",
            category: "documents",
            inputSchema: listDocumentsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create listDocumentsOperation"
        );
        throw new Error(
            `Failed to create listDocuments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list documents operation
 */
export async function executeListDocuments(
    client: PandaDocClient,
    params: ListDocumentsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listDocuments({
            q: params.q,
            status: params.status,
            count: params.count,
            page: params.page,
            tag: params.tag,
            order_by: params.orderBy
        })) as PandaDocListDocumentsResponse;

        const documents = response.results || [];

        return {
            success: true,
            data: {
                documents: documents.map((doc) => ({
                    id: doc.id,
                    name: doc.name,
                    status: doc.status,
                    dateCreated: doc.date_created,
                    dateModified: doc.date_modified,
                    expirationDate: doc.expiration_date
                })),
                count: documents.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list documents",
                retryable: true
            }
        };
    }
}
