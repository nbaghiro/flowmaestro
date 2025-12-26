import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppMessageTemplateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Get Message Templates operation schema
 */
export const getMessageTemplatesSchema = z.object({
    wabaId: z.string().describe("The WhatsApp Business Account ID"),
    status: z
        .enum(["APPROVED", "PENDING", "REJECTED"])
        .optional()
        .describe("Filter templates by status"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of templates to return")
});

export type GetMessageTemplatesParams = z.infer<typeof getMessageTemplatesSchema>;

/**
 * Get Message Templates operation definition
 */
export const getMessageTemplatesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMessageTemplates",
            name: "Get Message Templates",
            description: "List message templates for a WhatsApp Business Account",
            category: "templates",
            inputSchema: getMessageTemplatesSchema,
            inputSchemaJSON: toJSONSchema(getMessageTemplatesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "WhatsApp", err: error }, "Failed to create getMessageTemplatesOperation");
        throw new Error(
            `Failed to create getMessageTemplates operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get message templates operation
 */
export async function executeGetMessageTemplates(
    client: WhatsAppClient,
    params: GetMessageTemplatesParams
): Promise<OperationResult> {
    try {
        const response = await client.getMessageTemplates(params.wabaId, {
            status: params.status,
            limit: params.limit
        });

        const templates: WhatsAppMessageTemplateResponse[] = response.data.map((template) => ({
            id: template.id,
            name: template.name,
            status: template.status,
            category: template.category,
            language: template.language,
            components: template.components.map((comp) => ({
                type: comp.type,
                text: comp.text,
                format: comp.format,
                buttons: comp.buttons?.map((btn) => ({
                    type: btn.type,
                    text: btn.text,
                    url: btn.url,
                    phoneNumber: btn.phone_number
                }))
            }))
        }));

        return {
            success: true,
            data: {
                templates,
                hasMore: !!response.paging?.cursors?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get message templates",
                retryable: true
            }
        };
    }
}
