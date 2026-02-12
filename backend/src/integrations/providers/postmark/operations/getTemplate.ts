import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const getTemplateSchema = z.object({
    templateIdOrAlias: z
        .union([z.number(), z.string()])
        .describe("Template ID (number) or alias (string)")
});

export type GetTemplateParams = z.infer<typeof getTemplateSchema>;

export const getTemplateOperation: OperationDefinition = {
    id: "getTemplate",
    name: "Get Template",
    description: "Get a specific email template by ID or alias",
    category: "data",
    inputSchema: getTemplateSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetTemplate(
    client: PostmarkClient,
    params: GetTemplateParams
): Promise<OperationResult> {
    try {
        const template = await client.getTemplate(params.templateIdOrAlias);

        return {
            success: true,
            data: {
                templateId: template.TemplateId,
                name: template.Name,
                alias: template.Alias,
                subject: template.Subject,
                active: template.Active,
                templateType: template.TemplateType,
                layoutTemplate: template.LayoutTemplate,
                htmlBody: template.HtmlBody,
                textBody: template.TextBody
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get template";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
