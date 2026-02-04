import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import { PandaDocTemplateUuidSchema, PandaDocRecipientSchema } from "../schemas";
import type { PandaDocCreateDocumentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create document operation schema
 */
export const createDocumentSchema = z.object({
    name: z.string().min(1).describe("Document name"),
    templateUuid: PandaDocTemplateUuidSchema,
    recipients: z.array(PandaDocRecipientSchema).min(1).describe("Recipients for the document"),
    fields: z
        .record(z.object({ value: z.string() }))
        .optional()
        .describe("Field values to pre-fill (key is field name)"),
    metadata: z.record(z.string()).optional().describe("Custom metadata key-value pairs")
});

export type CreateDocumentParams = z.infer<typeof createDocumentSchema>;

/**
 * Create document operation definition
 */
export const createDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createDocument",
            name: "Create Document",
            description: "Create a new document from a PandaDoc template",
            category: "documents",
            inputSchema: createDocumentSchema,
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
            "Failed to create createDocumentOperation"
        );
        throw new Error(
            `Failed to create createDocument operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create document operation
 */
export async function executeCreateDocument(
    client: PandaDocClient,
    params: CreateDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.createDocument({
            name: params.name,
            template_uuid: params.templateUuid,
            recipients: params.recipients.map((r) => ({
                email: r.email,
                first_name: r.firstName,
                last_name: r.lastName,
                role: r.role
            })),
            fields: params.fields,
            metadata: params.metadata
        })) as PandaDocCreateDocumentResponse;

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                status: response.status,
                dateCreated: response.date_created,
                uuid: response.uuid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create document",
                retryable: false
            }
        };
    }
}
