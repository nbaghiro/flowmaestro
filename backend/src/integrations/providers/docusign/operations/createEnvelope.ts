import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DocuSignClient } from "../client/DocuSignClient";
import type { DocuSignCreateEnvelopeResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create envelope operation schema
 */
export const createEnvelopeSchema = z.object({
    emailSubject: z.string().min(1).describe("Subject line for the envelope email"),
    emailBlurb: z.string().optional().describe("Message body for the envelope email"),
    status: z
        .enum(["created", "sent"])
        .default("sent")
        .describe("'created' to save as draft, 'sent' to send immediately"),
    documents: z
        .array(
            z.object({
                documentId: z.string().describe("Unique document ID (e.g., '1')"),
                name: z.string().describe("Document name"),
                fileExtension: z.string().optional().describe("File extension (e.g., 'pdf')"),
                documentBase64: z.string().optional().describe("Base64-encoded document content"),
                remoteUrl: z.string().url().optional().describe("URL to fetch document from")
            })
        )
        .min(1)
        .describe("Documents to include in the envelope"),
    signers: z
        .array(
            z.object({
                email: z.string().email().describe("Signer email address"),
                name: z.string().min(1).describe("Signer name"),
                recipientId: z.string().describe("Unique recipient ID (e.g., '1')"),
                routingOrder: z.string().optional().describe("Signing order (e.g., '1')"),
                clientUserId: z.string().optional().describe("For embedded signing")
            })
        )
        .min(1)
        .describe("Signers for the envelope"),
    carbonCopies: z
        .array(
            z.object({
                email: z.string().email().describe("CC recipient email"),
                name: z.string().min(1).describe("CC recipient name"),
                recipientId: z.string().describe("Unique recipient ID"),
                routingOrder: z.string().optional().describe("Routing order")
            })
        )
        .optional()
        .describe("CC recipients")
});

export type CreateEnvelopeParams = z.infer<typeof createEnvelopeSchema>;

/**
 * Create envelope operation definition
 */
export const createEnvelopeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createEnvelope",
            name: "Create Envelope",
            description: "Create and optionally send a DocuSign envelope for signatures",
            category: "envelopes",
            inputSchema: createEnvelopeSchema,
            inputSchemaJSON: toJSONSchema(createEnvelopeSchema),
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
            "Failed to create createEnvelopeOperation"
        );
        throw new Error(
            `Failed to create createEnvelope operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create envelope operation
 */
export async function executeCreateEnvelope(
    client: DocuSignClient,
    params: CreateEnvelopeParams
): Promise<OperationResult> {
    try {
        const response = (await client.createEnvelope({
            emailSubject: params.emailSubject,
            emailBlurb: params.emailBlurb,
            status: params.status,
            documents: params.documents.map((doc) => ({
                documentId: doc.documentId,
                name: doc.name,
                fileExtension: doc.fileExtension,
                documentBase64: doc.documentBase64,
                remoteUrl: doc.remoteUrl
            })),
            recipients: {
                signers: params.signers.map((s) => ({
                    email: s.email,
                    name: s.name,
                    recipientId: s.recipientId,
                    routingOrder: s.routingOrder,
                    clientUserId: s.clientUserId
                })),
                carbonCopies: params.carbonCopies?.map((c) => ({
                    email: c.email,
                    name: c.name,
                    recipientId: c.recipientId,
                    routingOrder: c.routingOrder
                }))
            }
        })) as DocuSignCreateEnvelopeResponse;

        return {
            success: true,
            data: {
                envelopeId: response.envelopeId,
                status: response.status,
                statusDateTime: response.statusDateTime,
                uri: response.uri
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create envelope",
                retryable: false
            }
        };
    }
}
