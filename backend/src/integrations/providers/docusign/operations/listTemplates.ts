import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DocuSignClient } from "../client/DocuSignClient";
import type { DocuSignListTemplatesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List templates operation schema
 */
export const listTemplatesSchema = z.object({
    count: z.string().default("25").describe("Number of results to return (max 100)"),
    startPosition: z.string().optional().describe("Starting position for pagination"),
    searchText: z.string().optional().describe("Search templates by name"),
    folder: z.string().optional().describe("Filter by folder ID or 'shared_templates'")
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
            description: "List envelope templates in your DocuSign account",
            category: "templates",
            inputSchema: listTemplatesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
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
    client: DocuSignClient,
    params: ListTemplatesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listTemplates({
            count: params.count,
            startPosition: params.startPosition,
            searchText: params.searchText,
            folder: params.folder
        })) as DocuSignListTemplatesResponse;

        const templates = response.envelopeTemplates || [];

        return {
            success: true,
            data: {
                templates: templates.map((tmpl) => ({
                    templateId: tmpl.templateId,
                    name: tmpl.name,
                    description: tmpl.description,
                    shared: tmpl.shared,
                    created: tmpl.created,
                    lastModified: tmpl.lastModified,
                    folderName: tmpl.folderName,
                    owner: tmpl.owner,
                    recipients: tmpl.recipients
                })),
                pagination: {
                    resultSetSize: parseInt(response.resultSetSize),
                    totalSetSize: parseInt(response.totalSetSize),
                    startPosition: parseInt(response.startPosition)
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
