import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DocuSignClient } from "../client/DocuSignClient";
import { DocuSignEnvelopeIdSchema } from "../schemas";
import type { DocuSignEnvelopeWithDetails } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get envelope operation schema
 */
export const getEnvelopeSchema = z.object({
    envelopeId: DocuSignEnvelopeIdSchema,
    include: z
        .string()
        .optional()
        .describe("Comma-separated list of additional info (e.g., 'recipients,documents')")
});

export type GetEnvelopeParams = z.infer<typeof getEnvelopeSchema>;

/**
 * Get envelope operation definition
 */
export const getEnvelopeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEnvelope",
            name: "Get Envelope",
            description: "Get the status and details of a DocuSign envelope",
            category: "envelopes",
            inputSchema: getEnvelopeSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
            "Failed to create getEnvelopeOperation"
        );
        throw new Error(
            `Failed to create getEnvelope operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get envelope operation
 */
export async function executeGetEnvelope(
    client: DocuSignClient,
    params: GetEnvelopeParams
): Promise<OperationResult> {
    try {
        const envelope = (await client.getEnvelope(
            params.envelopeId,
            params.include
        )) as DocuSignEnvelopeWithDetails;

        return {
            success: true,
            data: {
                envelopeId: envelope.envelopeId,
                status: envelope.status,
                emailSubject: envelope.emailSubject,
                emailBlurb: envelope.emailBlurb,
                createdDateTime: envelope.createdDateTime,
                sentDateTime: envelope.sentDateTime,
                completedDateTime: envelope.completedDateTime,
                voidedDateTime: envelope.voidedDateTime,
                voidedReason: envelope.voidedReason,
                documents: envelope.documents,
                recipients: envelope.recipients
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get envelope",
                retryable: true
            }
        };
    }
}
