import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HelloSignClient } from "../client/HelloSignClient";
import { HelloSignSignerSchema } from "../schemas";
import type { HelloSignCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create signature request operation schema
 */
export const createSignatureRequestSchema = z.object({
    title: z.string().min(1).describe("Title of the signature request"),
    subject: z.string().optional().describe("Subject line for the email"),
    message: z.string().optional().describe("Message to include in the email"),
    signers: z.array(HelloSignSignerSchema).min(1).describe("List of signers"),
    cc_email_addresses: z
        .array(z.string().email())
        .optional()
        .describe("Email addresses to CC on the request"),
    file_urls: z.array(z.string().url()).min(1).describe("URLs of documents to sign"),
    test_mode: z.boolean().default(false).describe("Whether to create in test mode"),
    signing_redirect_url: z
        .string()
        .url()
        .optional()
        .describe("URL to redirect signers after signing"),
    metadata: z.record(z.unknown()).optional().describe("Custom metadata to attach")
});

export type CreateSignatureRequestParams = z.infer<typeof createSignatureRequestSchema>;

/**
 * Create signature request operation definition
 */
export const createSignatureRequestOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createSignatureRequest",
            name: "Create Signature Request",
            description: "Create and send a document for electronic signature via HelloSign",
            category: "signature_requests",
            inputSchema: createSignatureRequestSchema,
            inputSchemaJSON: toJSONSchema(createSignatureRequestSchema),
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
            "Failed to create createSignatureRequestOperation"
        );
        throw new Error(
            `Failed to create createSignatureRequest operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create signature request operation
 */
export async function executeCreateSignatureRequest(
    client: HelloSignClient,
    params: CreateSignatureRequestParams
): Promise<OperationResult> {
    try {
        const response = (await client.createSignatureRequest({
            title: params.title,
            subject: params.subject,
            message: params.message,
            signers: params.signers.map((s) => ({
                email_address: s.email_address,
                name: s.name,
                order: s.order,
                pin: s.pin
            })),
            cc_email_addresses: params.cc_email_addresses,
            file_urls: params.file_urls,
            test_mode: params.test_mode,
            signing_redirect_url: params.signing_redirect_url,
            metadata: params.metadata
        })) as HelloSignCreateResponse;

        return {
            success: true,
            data: {
                signature_request_id: response.signature_request.signature_request_id,
                title: response.signature_request.title,
                is_complete: response.signature_request.is_complete,
                is_declined: response.signature_request.is_declined,
                created_at: response.signature_request.created_at,
                signing_url: response.signature_request.signing_url,
                details_url: response.signature_request.details_url,
                signatures: response.signature_request.signatures
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create signature request",
                retryable: false
            }
        };
    }
}
