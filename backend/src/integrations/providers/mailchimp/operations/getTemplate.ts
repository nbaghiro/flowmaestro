import { z } from "zod";
import type { MailchimpTemplateOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getTemplateSchema = z.object({
    templateId: z.number().int().positive().describe("The unique ID of the template")
});

export type GetTemplateParams = z.infer<typeof getTemplateSchema>;

export const getTemplateOperation: OperationDefinition = {
    id: "getTemplate",
    name: "Get Template",
    description: "Get a single email template by ID from Mailchimp",
    category: "templates",
    inputSchema: getTemplateSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetTemplate(
    client: MailchimpClient,
    params: GetTemplateParams
): Promise<OperationResult> {
    try {
        const template = await client.getTemplate(params.templateId);

        const output: MailchimpTemplateOutput = {
            id: template.id,
            name: template.name,
            type: template.type,
            category: template.category,
            active: template.active,
            dragAndDrop: template.drag_and_drop,
            responsive: template.responsive,
            dateCreated: template.date_created,
            dateEdited: template.date_edited
        };

        return {
            success: true,
            data: output
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get template",
                retryable: true
            }
        };
    }
}
