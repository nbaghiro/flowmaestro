import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DocuSignClient } from "../client/DocuSignClient";
import type { DocuSignListEnvelopesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List envelopes operation schema
 */
export const listEnvelopesSchema = z.object({
    fromDate: z.string().optional().describe("Start date (ISO 8601, e.g., '2024-01-01')"),
    toDate: z.string().optional().describe("End date (ISO 8601)"),
    status: z
        .enum(["created", "sent", "delivered", "signed", "completed", "declined", "voided"])
        .optional()
        .describe("Filter by envelope status"),
    count: z.string().default("25").describe("Number of results to return (max 100)"),
    startPosition: z.string().optional().describe("Starting position for pagination"),
    include: z
        .string()
        .optional()
        .describe("Additional information to include (e.g., 'recipients,documents')")
});

export type ListEnvelopesParams = z.infer<typeof listEnvelopesSchema>;

/**
 * List envelopes operation definition
 */
export const listEnvelopesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listEnvelopes",
            name: "List Envelopes",
            description: "List envelopes in your DocuSign account with optional filters",
            category: "envelopes",
            inputSchema: listEnvelopesSchema,
            inputSchemaJSON: toJSONSchema(listEnvelopesSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
            "Failed to create listEnvelopesOperation"
        );
        throw new Error(
            `Failed to create listEnvelopes operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list envelopes operation
 */
export async function executeListEnvelopes(
    client: DocuSignClient,
    params: ListEnvelopesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listEnvelopes({
            fromDate: params.fromDate,
            toDate: params.toDate,
            status: params.status,
            count: params.count,
            startPosition: params.startPosition,
            include: params.include
        })) as DocuSignListEnvelopesResponse;

        const envelopes = response.envelopes || [];

        return {
            success: true,
            data: {
                envelopes: envelopes.map((env) => ({
                    envelopeId: env.envelopeId,
                    status: env.status,
                    emailSubject: env.emailSubject,
                    createdDateTime: env.createdDateTime,
                    sentDateTime: env.sentDateTime,
                    completedDateTime: env.completedDateTime
                })),
                pagination: {
                    resultSetSize: parseInt(response.resultSetSize),
                    totalSetSize: parseInt(response.totalSetSize),
                    startPosition: parseInt(response.startPosition),
                    endPosition: response.endPosition ? parseInt(response.endPosition) : undefined
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list envelopes",
                retryable: true
            }
        };
    }
}
