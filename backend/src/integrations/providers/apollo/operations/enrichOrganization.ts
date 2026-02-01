import { enrichOrganizationInputSchema, type EnrichOrganizationInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const enrichOrganizationOperation: OperationDefinition = {
    id: "enrichOrganization",
    name: "Enrich Organization",
    description:
        "Enrich an organization's profile with additional data from Apollo. Consumes credits.",
    category: "enrichment",
    inputSchema: enrichOrganizationInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeEnrichOrganization(
    client: ApolloClient,
    params: EnrichOrganizationInput
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            organization: unknown;
            credits_used: number;
        }>("/api/v1/organizations/enrich", params);

        return {
            success: true,
            data: {
                organization: response.organization,
                credits_used: response.credits_used
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to enrich organization",
                retryable: true
            }
        };
    }
}
