import { toJSONSchema } from "../../../core/schema-utils";
import { searchPeopleInputSchema, type SearchPeopleInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const searchPeopleOperation: OperationDefinition = {
    id: "searchPeople",
    name: "Search People",
    description:
        "Search Apollo's database of 210M+ people with demographic filters. Does not consume credits.",
    category: "search",
    inputSchema: searchPeopleInputSchema,
    inputSchemaJSON: toJSONSchema(searchPeopleInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeSearchPeople(
    client: ApolloClient,
    params: SearchPeopleInput
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            people: unknown[];
            pagination: { total_entries: number; total_pages: number; page: number };
        }>("/api/v1/mixed_people/api_search", params);

        return {
            success: true,
            data: {
                people: response.people,
                pagination: response.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search people",
                retryable: true
            }
        };
    }
}
