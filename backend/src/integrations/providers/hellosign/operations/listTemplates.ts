import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { HelloSignClient } from "../client/HelloSignClient";
import type { HelloSignListResponse, HelloSignTemplate } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List templates operation schema
 */
export const listTemplatesSchema = z.object({
    page: z.number().int().min(1).default(1).describe("Page number (starting at 1)"),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of results per page (max 100)"),
    account_id: z.string().optional().describe("Filter by specific account ID")
});

export type ListTemplatesParams = z.infer<typeof listTemplatesSchema>;

/**
 * List templates operation definition
 */
export const listTemplatesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTemplates",
            name: "List Templates",
            description: "List all signature templates in your HelloSign account",
            category: "templates",
            inputSchema: listTemplatesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
            "Failed to create listTemplatesOperation"
        );
        throw new Error(
            `Failed to create listTemplates operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list templates operation
 */
export async function executeListTemplates(
    client: HelloSignClient,
    params: ListTemplatesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listTemplates({
            page: params.page,
            page_size: params.page_size,
            account_id: params.account_id
        })) as HelloSignListResponse<HelloSignTemplate>;

        const templates = response.templates || [];

        return {
            success: true,
            data: {
                templates: templates.map((tmpl) => ({
                    template_id: tmpl.template_id,
                    title: tmpl.title,
                    message: tmpl.message,
                    signer_roles: tmpl.signer_roles,
                    cc_roles: tmpl.cc_roles,
                    documents: tmpl.documents,
                    custom_fields: tmpl.custom_fields,
                    is_creator: tmpl.is_creator,
                    can_edit: tmpl.can_edit
                })),
                pagination: {
                    page: response.list_info.page,
                    page_size: response.list_info.page_size,
                    total_pages: response.list_info.num_pages,
                    total_results: response.list_info.num_results
                }
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
