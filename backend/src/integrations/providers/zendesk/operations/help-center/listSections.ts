import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { SectionsResponse } from "../../types";

/**
 * List Sections Parameters
 */
export const listSectionsSchema = z.object({
    category_id: z.number().optional().describe("Filter sections by category ID"),
    locale: z.string().optional().describe("Filter by locale (e.g., 'en-us')"),
    page: z.number().optional().describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)"),
    sort_by: z
        .enum(["position", "name", "created_at", "updated_at"])
        .optional()
        .describe("Field to sort by"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order")
});

export type ListSectionsParams = z.infer<typeof listSectionsSchema>;

/**
 * Operation Definition
 */
export const listSectionsOperation: OperationDefinition = {
    id: "listSections",
    name: "List Sections",
    description: "List Help Center sections with optional filtering by category",
    category: "help-center",
    inputSchema: listSectionsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute List Sections
 */
export async function executeListSections(
    client: ZendeskClient,
    params: ListSectionsParams
): Promise<OperationResult> {
    try {
        // Determine endpoint based on category filter
        let endpoint = "/help_center/sections.json";
        if (params.category_id) {
            endpoint = `/help_center/categories/${params.category_id}/sections.json`;
        }

        const queryParams: Record<string, unknown> = {};
        if (params.locale) queryParams.locale = params.locale;
        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;
        if (params.sort_by) queryParams.sort_by = params.sort_by;
        if (params.sort_order) queryParams.sort_order = params.sort_order;

        const response = await client.get<SectionsResponse>(endpoint, queryParams);

        return {
            success: true,
            data: {
                sections: response.sections,
                count: response.count,
                next_page: response.next_page,
                previous_page: response.previous_page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list sections",
                retryable: true
            }
        };
    }
}
