import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpTemplateOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getTemplatesSchema = z.object({
    count: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of templates to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of templates to skip"),
    type: z.string().optional().describe("Filter by template type"),
    category: z.string().optional().describe("Filter by template category"),
    folderId: z.string().optional().describe("Filter by folder ID"),
    sortField: z
        .enum(["date_created", "date_edited", "name"])
        .optional()
        .describe("Field to sort by"),
    sortDir: z.enum(["ASC", "DESC"]).optional().describe("Sort direction")
});

export type GetTemplatesParams = z.infer<typeof getTemplatesSchema>;

export const getTemplatesOperation: OperationDefinition = {
    id: "getTemplates",
    name: "Get Templates",
    description: "Get all email templates from Mailchimp",
    category: "templates",
    inputSchema: getTemplatesSchema,
    inputSchemaJSON: toJSONSchema(getTemplatesSchema),
    retryable: true,
    timeout: 15000
};

export async function executeGetTemplates(
    client: MailchimpClient,
    params: GetTemplatesParams
): Promise<OperationResult> {
    try {
        const response = await client.getTemplates({
            count: params.count,
            offset: params.offset,
            type: params.type,
            category: params.category,
            folder_id: params.folderId,
            sort_field: params.sortField,
            sort_dir: params.sortDir
        });

        const templates: MailchimpTemplateOutput[] = response.templates.map((template) => ({
            id: template.id,
            name: template.name,
            type: template.type,
            category: template.category,
            active: template.active,
            dragAndDrop: template.drag_and_drop,
            responsive: template.responsive,
            dateCreated: template.date_created,
            dateEdited: template.date_edited
        }));

        return {
            success: true,
            data: {
                templates,
                totalItems: response.total_items,
                hasMore: (params.offset || 0) + templates.length < response.total_items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get templates",
                retryable: true
            }
        };
    }
}
