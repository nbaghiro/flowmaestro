import { enrichPersonInputSchema, type EnrichPersonInput } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ApolloClient } from "../client/ApolloClient";

export const enrichPersonOperation: OperationDefinition = {
    id: "enrichPerson",
    name: "Enrich Person",
    description: "Enrich a person's profile with additional data from Apollo. Consumes credits.",
    category: "enrichment",
    inputSchema: enrichPersonInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeEnrichPerson(
    client: ApolloClient,
    params: EnrichPersonInput
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            person: unknown;
            credits_used: number;
        }>("/api/v1/people/match", params);

        return {
            success: true,
            data: {
                person: response.person,
                credits_used: response.credits_used
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to enrich person",
                retryable: true
            }
        };
    }
}
