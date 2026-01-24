import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DocuSignClient } from "../client/DocuSignClient";
import { DocuSignEnvelopeIdSchema } from "../schemas";
import type { DocuSignRecipientsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get recipients operation schema
 */
export const getRecipientsSchema = z.object({
    envelopeId: DocuSignEnvelopeIdSchema,
    includeTabs: z.boolean().default(false).describe("Include tab/field information for signers")
});

export type GetRecipientsParams = z.infer<typeof getRecipientsSchema>;

/**
 * Get recipients operation definition
 */
export const getRecipientsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getRecipients",
            name: "Get Recipients",
            description: "Get the list of recipients and their status for an envelope",
            category: "recipients",
            inputSchema: getRecipientsSchema,
            inputSchemaJSON: toJSONSchema(getRecipientsSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
            "Failed to create getRecipientsOperation"
        );
        throw new Error(
            `Failed to create getRecipients operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get recipients operation
 */
export async function executeGetRecipients(
    client: DocuSignClient,
    params: GetRecipientsParams
): Promise<OperationResult> {
    try {
        const response = (await client.getRecipients(
            params.envelopeId,
            params.includeTabs ? "true" : undefined
        )) as DocuSignRecipientsResponse;

        return {
            success: true,
            data: {
                envelopeId: params.envelopeId,
                recipientCount: response.recipientCount,
                signers:
                    response.signers?.map((s) => ({
                        recipientId: s.recipientId,
                        email: s.email,
                        name: s.name,
                        status: s.status,
                        signedDateTime: s.signedDateTime,
                        deliveredDateTime: s.deliveredDateTime,
                        declinedDateTime: s.declinedDateTime,
                        declinedReason: s.declinedReason,
                        routingOrder: s.routingOrder
                    })) || [],
                carbonCopies:
                    response.carbonCopies?.map((c) => ({
                        recipientId: c.recipientId,
                        email: c.email,
                        name: c.name,
                        status: c.status,
                        routingOrder: c.routingOrder
                    })) || []
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get recipients",
                retryable: true
            }
        };
    }
}
