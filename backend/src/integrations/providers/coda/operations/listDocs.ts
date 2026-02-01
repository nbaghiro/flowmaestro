import { z } from "zod";
import { CodaClient } from "../client/CodaClient";
import { CodaLimitSchema } from "../schemas";
import type { CodaDocsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Documents operation schema
 */
export const listDocsSchema = z.object({
    limit: CodaLimitSchema
});

export type ListDocsParams = z.infer<typeof listDocsSchema>;

/**
 * List Documents operation definition
 */
export const listDocsOperation: OperationDefinition = {
    id: "listDocs",
    name: "List Documents",
    description: "List all Coda documents accessible with this API key",
    category: "documents",
    inputSchema: listDocsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute list documents operation
 */
export async function executeListDocs(
    client: CodaClient,
    params: ListDocsParams
): Promise<OperationResult> {
    try {
        const response = await client.get<CodaDocsResponse>("/docs", {
            limit: params.limit
        });

        const documents = response.items.map((doc) => ({
            id: doc.id,
            name: doc.name,
            owner: doc.ownerName,
            browserLink: doc.browserLink,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        }));

        return {
            success: true,
            data: {
                documents,
                nextPageToken: response.nextPageToken
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
