import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { NotionClient } from "../client/NotionClient";

/**
 * Create page input schema
 */
export const createPageSchema = z.object({
    parent_id: z.string().min(1).describe("Parent page or database ID"),
    parent_type: z.enum(["page_id", "database_id"]).describe("Type of parent (page or database)"),
    title: z.string().min(1).describe("Page title"),
    properties: z.record(z.unknown()).optional().describe("Page properties (for database pages)"),
    children: z.array(z.unknown()).optional().describe("Page content blocks")
});

export type CreatePageParams = z.infer<typeof createPageSchema>;

/**
 * Create page operation definition
 */
export const createPageOperation: OperationDefinition = {
    id: "createPage",
    name: "Create Page",
    description: "Create a new page in Notion",
    category: "write",
    retryable: true,
    inputSchema: createPageSchema
};

/**
 * Execute create page operation
 */
export async function executeCreatePage(
    client: NotionClient,
    params: CreatePageParams
): Promise<OperationResult> {
    try {
        // Build parent object
        const parent: { page_id?: string; database_id?: string } = {};
        if (params.parent_type === "page_id") {
            parent.page_id = params.parent_id;
        } else {
            parent.database_id = params.parent_id;
        }

        // Build properties with title
        const properties: Record<string, unknown> = params.properties || {};

        // Add title property - format depends on parent type
        if (params.parent_type === "page_id") {
            properties.title = {
                title: [
                    {
                        text: {
                            content: params.title
                        }
                    }
                ]
            };
        } else {
            // For database pages, title format might be different
            // This is a generic approach, might need customization per database
            if (!properties.Name && !properties.title) {
                properties.Name = {
                    title: [
                        {
                            text: {
                                content: params.title
                            }
                        }
                    ]
                };
            }
        }

        const response = await client.createPage({
            parent,
            properties,
            children: params.children
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Notion page",
                retryable: true
            }
        };
    }
}
