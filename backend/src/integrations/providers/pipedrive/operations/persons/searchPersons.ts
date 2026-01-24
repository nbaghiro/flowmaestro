import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveSearchResult, PipedrivePerson } from "../types";

/**
 * Search Persons Parameters
 */
export const searchPersonsSchema = z.object({
    term: z.string().min(1).describe("Search term to match against name, email, or phone"),
    fields: z
        .enum(["name", "email", "phone", "notes", "custom_fields"])
        .optional()
        .describe("Fields to search in"),
    exact_match: z.boolean().optional().default(false).describe("Whether to match exact term only"),
    org_id: z.number().int().optional().describe("Filter by organization ID"),
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page")
});

export type SearchPersonsParams = z.infer<typeof searchPersonsSchema>;

/**
 * Operation Definition
 */
export const searchPersonsOperation: OperationDefinition = {
    id: "searchPersons",
    name: "Search Contacts",
    description: "Search contacts by name, email, or phone",
    category: "persons",
    inputSchema: searchPersonsSchema,
    inputSchemaJSON: toJSONSchema(searchPersonsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Persons
 */
export async function executeSearchPersons(
    client: PipedriveClient,
    params: SearchPersonsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            term: params.term,
            item_types: "person",
            start: params.start,
            limit: params.limit
        };

        if (params.fields) {
            queryParams.fields = params.fields;
        }
        if (params.exact_match) {
            queryParams.exact_match = params.exact_match;
        }
        if (params.org_id !== undefined) {
            queryParams.org_id = params.org_id;
        }

        const response = await client.get<PipedriveSearchResult<PipedrivePerson>>(
            "/persons/search",
            queryParams
        );

        const items = response.data?.items?.map((item) => item.item) || [];

        return {
            success: true,
            data: {
                persons: items,
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search contacts",
                retryable: true
            }
        };
    }
}
