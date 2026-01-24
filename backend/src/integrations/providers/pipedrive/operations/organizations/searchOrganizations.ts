import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveSearchResult, PipedriveOrganization } from "../types";

/**
 * Search Organizations Parameters
 */
export const searchOrganizationsSchema = z.object({
    term: z.string().min(1).describe("Search term to match against organization name"),
    fields: z
        .enum(["name", "address", "notes", "custom_fields"])
        .optional()
        .describe("Fields to search in"),
    exact_match: z.boolean().optional().default(false).describe("Whether to match exact term only"),
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page")
});

export type SearchOrganizationsParams = z.infer<typeof searchOrganizationsSchema>;

/**
 * Operation Definition
 */
export const searchOrganizationsOperation: OperationDefinition = {
    id: "searchOrganizations",
    name: "Search Organizations",
    description: "Search organizations by name",
    category: "organizations",
    inputSchema: searchOrganizationsSchema,
    inputSchemaJSON: toJSONSchema(searchOrganizationsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Organizations
 */
export async function executeSearchOrganizations(
    client: PipedriveClient,
    params: SearchOrganizationsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            term: params.term,
            item_types: "organization",
            start: params.start,
            limit: params.limit
        };

        if (params.fields) {
            queryParams.fields = params.fields;
        }
        if (params.exact_match) {
            queryParams.exact_match = params.exact_match;
        }

        const response = await client.get<PipedriveSearchResult<PipedriveOrganization>>(
            "/organizations/search",
            queryParams
        );

        const items = response.data?.items?.map((item) => item.item) || [];

        return {
            success: true,
            data: {
                organizations: items,
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search organizations",
                retryable: true
            }
        };
    }
}
