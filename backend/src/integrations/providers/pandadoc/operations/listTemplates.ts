import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { PandaDocClient } from "../client/PandaDocClient";
import type { PandaDocListTemplatesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List templates operation schema
 */
export const listTemplatesSchema = z.object({
    q: z.string().optional().describe("Search query (template name)"),
    count: z.number().min(1).max(100).optional().describe("Results per page (max 100)"),
    page: z.number().min(1).optional().describe("Page number (1-based)"),
    tag: z.array(z.string()).optional().describe("Filter by tags"),
    shared: z.boolean().optional().describe("Return only shared templates")
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
            description: "List available PandaDoc templates",
            category: "templates",
            inputSchema: listTemplatesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "PandaDoc", err: error },
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
    client: PandaDocClient,
    params: ListTemplatesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listTemplates({
            q: params.q,
            count: params.count,
            page: params.page,
            tag: params.tag,
            shared: params.shared
        })) as PandaDocListTemplatesResponse;

        const templates = response.results || [];

        return {
            success: true,
            data: {
                templates: templates.map((tmpl) => ({
                    id: tmpl.id,
                    name: tmpl.name,
                    dateCreated: tmpl.date_created,
                    dateModified: tmpl.date_modified
                })),
                count: templates.length
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
