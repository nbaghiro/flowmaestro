import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DocuSignClient } from "../client/DocuSignClient";
import { DocuSignEnvelopeIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Void envelope operation schema
 */
export const voidEnvelopeSchema = z.object({
    envelopeId: DocuSignEnvelopeIdSchema,
    voidedReason: z.string().min(1).describe("Reason for voiding the envelope")
});

export type VoidEnvelopeParams = z.infer<typeof voidEnvelopeSchema>;

/**
 * Void envelope operation definition
 */
export const voidEnvelopeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "voidEnvelope",
            name: "Void Envelope",
            description: "Void a DocuSign envelope to cancel it",
            category: "envelopes",
            inputSchema: voidEnvelopeSchema,
            inputSchemaJSON: toJSONSchema(voidEnvelopeSchema),
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
            "Failed to create voidEnvelopeOperation"
        );
        throw new Error(
            `Failed to create voidEnvelope operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute void envelope operation
 */
export async function executeVoidEnvelope(
    client: DocuSignClient,
    params: VoidEnvelopeParams
): Promise<OperationResult> {
    try {
        await client.voidEnvelope(params.envelopeId, params.voidedReason);

        return {
            success: true,
            data: {
                envelopeId: params.envelopeId,
                voided: true,
                voidedReason: params.voidedReason,
                message: "Envelope has been voided"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to void envelope",
                retryable: false
            }
        };
    }
}
