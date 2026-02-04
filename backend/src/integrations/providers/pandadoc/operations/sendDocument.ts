import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import { PandaDocDocumentIdSchema } from "../schemas";
import type { PandaDocSendDocumentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send document operation schema
 */
export const sendDocumentSchema = z.object({
    documentId: PandaDocDocumentIdSchema,
    message: z.string().optional().describe("Message to include in the email notification"),
    subject: z.string().optional().describe("Custom email subject line"),
    silent: z
        .boolean()
        .optional()
        .describe("If true, do not send email notifications to recipients")
});

export type SendDocumentParams = z.infer<typeof sendDocumentSchema>;

/**
 * Send document operation definition
 */
export const sendDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendDocument",
            name: "Send Document",
            description: "Send a document to recipients for signing",
            category: "documents",
            inputSchema: sendDocumentSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create sendDocumentOperation"
        );
        throw new Error(
            `Failed to create sendDocument operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send document operation
 */
export async function executeSendDocument(
    client: PandaDocClient,
    params: SendDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.sendDocument(params.documentId, {
            message: params.message,
            subject: params.subject,
            silent: params.silent
        })) as PandaDocSendDocumentResponse;

        return {
            success: true,
            data: {
                id: response.id,
                status: response.status,
                uuid: response.uuid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send document",
                retryable: false
            }
        };
    }
}
