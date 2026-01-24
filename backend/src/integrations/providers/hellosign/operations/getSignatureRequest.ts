import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HelloSignClient } from "../client/HelloSignClient";
import { HelloSignRequestIdSchema } from "../schemas";
import type { HelloSignSignatureRequest } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get signature request operation schema
 */
export const getSignatureRequestSchema = z.object({
    signature_request_id: HelloSignRequestIdSchema
});

export type GetSignatureRequestParams = z.infer<typeof getSignatureRequestSchema>;

/**
 * Get signature request operation definition
 */
export const getSignatureRequestOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getSignatureRequest",
            name: "Get Signature Request",
            description: "Get the status and details of a signature request",
            category: "signature_requests",
            inputSchema: getSignatureRequestSchema,
            inputSchemaJSON: toJSONSchema(getSignatureRequestSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
            "Failed to create getSignatureRequestOperation"
        );
        throw new Error(
            `Failed to create getSignatureRequest operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get signature request operation
 */
export async function executeGetSignatureRequest(
    client: HelloSignClient,
    params: GetSignatureRequestParams
): Promise<OperationResult> {
    try {
        const response = (await client.getSignatureRequest(params.signature_request_id)) as {
            signature_request: HelloSignSignatureRequest;
        };

        const request = response.signature_request;

        return {
            success: true,
            data: {
                signature_request_id: request.signature_request_id,
                title: request.title,
                subject: request.subject,
                message: request.message,
                is_complete: request.is_complete,
                is_declined: request.is_declined,
                has_error: request.has_error,
                test_mode: request.test_mode,
                created_at: request.created_at,
                signing_url: request.signing_url,
                details_url: request.details_url,
                files_url: request.files_url,
                final_copy_uri: request.final_copy_uri,
                signatures: request.signatures.map((sig) => ({
                    email: sig.signer_email_address,
                    name: sig.signer_name,
                    status: sig.status_code,
                    signed_at: sig.signed_at,
                    decline_reason: sig.decline_reason
                })),
                requester_email: request.requester_email_address
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get signature request",
                retryable: true
            }
        };
    }
}
