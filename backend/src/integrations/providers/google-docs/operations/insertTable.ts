import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Insert table input schema
 */
export const insertTableSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document"),
    rows: z.number().int().min(1).max(100).describe("Number of rows in the table"),
    columns: z.number().int().min(1).max(20).describe("Number of columns in the table"),
    index: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
            "The index in the document to insert the table at. If not specified, inserts at the end."
        )
});

export type InsertTableParams = z.infer<typeof insertTableSchema>;

/**
 * Insert table operation definition
 */
export const insertTableOperation: OperationDefinition = {
    id: "insertTable",
    name: "Insert Table",
    description: "Insert a table into a Google Docs document",
    category: "documents",
    retryable: true,
    inputSchema: insertTableSchema
};

interface BatchUpdateResponse {
    documentId: string;
    replies?: unknown[];
}

/**
 * Execute insert table operation
 * Uses batchUpdate with insertTable request
 */
export async function executeInsertTable(
    client: GoogleDocsClient,
    params: InsertTableParams
): Promise<OperationResult> {
    try {
        // Build the insertTable request
        const insertTableRequest: {
            insertTable: {
                rows: number;
                columns: number;
                location?: { index: number };
                endOfSegmentLocation?: { segmentId: string };
            };
        } = {
            insertTable: {
                rows: params.rows,
                columns: params.columns
            }
        };

        // If index is specified, use location; otherwise use endOfSegmentLocation
        if (params.index !== undefined) {
            insertTableRequest.insertTable.location = { index: params.index };
        } else {
            insertTableRequest.insertTable.endOfSegmentLocation = { segmentId: "" };
        }

        const requests = [insertTableRequest];

        const response = (await client.batchUpdate(
            params.documentId,
            requests
        )) as BatchUpdateResponse;

        return {
            success: true,
            data: {
                documentId: response.documentId,
                inserted: true,
                rows: params.rows,
                columns: params.columns
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to insert table",
                retryable: true
            }
        };
    }
}
