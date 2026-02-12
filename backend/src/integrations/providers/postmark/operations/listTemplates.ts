import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const listTemplatesSchema = z.object({
    count: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe("Number of templates to return (default: 100, max: 500)"),
    offset: z.number().min(0).optional().describe("Offset for pagination (default: 0)"),
    templateType: z
        .enum(["Standard", "Layout", "All"])
        .optional()
        .describe("Filter by template type (default: All)")
});

export type ListTemplatesParams = z.infer<typeof listTemplatesSchema>;

export const listTemplatesOperation: OperationDefinition = {
    id: "listTemplates",
    name: "List Templates",
    description: "List all email templates in your Postmark server",
    category: "data",
    inputSchema: listTemplatesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTemplates(
    client: PostmarkClient,
    params: ListTemplatesParams
): Promise<OperationResult> {
    try {
        const response = await client.listTemplates({
            count: params.count,
            offset: params.offset,
            templateType: params.templateType
        });

        return {
            success: true,
            data: {
                totalCount: response.TotalCount,
                templates: response.Templates.map((t) => ({
                    templateId: t.TemplateId,
                    name: t.Name,
                    alias: t.Alias,
                    subject: t.Subject,
                    active: t.Active,
                    templateType: t.TemplateType,
                    layoutTemplate: t.LayoutTemplate
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list templates",
                retryable: true
            }
        };
    }
}
