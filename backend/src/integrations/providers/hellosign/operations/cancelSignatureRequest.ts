import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HelloSignClient } from "../client/HelloSignClient";
import { HelloSignRequestIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Cancel signature request operation schema
 */
export const cancelSignatureRequestSchema = z.object({
    signature_request_id: HelloSignRequestIdSchema
});

export type CancelSignatureRequestParams = z.infer<typeof cancelSignatureRequestSchema>;

/**
 * Cancel signature request operation definition
 */
export const cancelSignatureRequestOperation: OperationDefinition = (() => {
    try {
        return {
            id: "cancelSignatureRequest",
            name: "Cancel Signature Request",
            description: "Cancel a pending signature request",
            category: "signature_requests",
            inputSchema: cancelSignatureRequestSchema,
            inputSchemaJSON: toJSONSchema(cancelSignatureRequestSchema),
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
            "Failed to create cancelSignatureRequestOperation"
        );
        throw new Error(
            `Failed to create cancelSignatureRequest operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute cancel signature request operation
 */
export async function executeCancelSignatureRequest(
    client: HelloSignClient,
    params: CancelSignatureRequestParams
): Promise<OperationResult> {
    try {
        await client.cancelSignatureRequest(params.signature_request_id);

        return {
            success: true,
            data: {
                signature_request_id: params.signature_request_id,
                cancelled: true,
                message: "Signature request has been cancelled"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to cancel signature request",
                retryable: false
            }
        };
    }
}
