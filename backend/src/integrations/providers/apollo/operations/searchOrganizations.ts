import { searchOrganizationsInputSchema, type SearchOrganizationsInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const searchOrganizationsOperation: OperationDefinition = {
    id: "searchOrganizations",
    name: "Search Organizations",
    description:
        "Search Apollo's database of 35M+ companies with filters. Consumes credits per search.",
    category: "search",
    inputSchema: searchOrganizationsInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchOrganizations(
    client: ApolloClient,
    params: SearchOrganizationsInput
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            organizations: unknown[];
            pagination: { total_entries: number; total_pages: number; page: number };
        }>("/api/v1/mixed_companies/search", params);

        return {
            success: true,
            data: {
                organizations: response.organizations,
                pagination: response.pagination
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
