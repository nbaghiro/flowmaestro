import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MediumClient } from "../client/MediumClient";

export const getPublicationContributorsSchema = z.object({
    publicationId: z.string().describe("The publication ID to get contributors for")
});

export type GetPublicationContributorsParams = z.infer<typeof getPublicationContributorsSchema>;

export const getPublicationContributorsOperation: OperationDefinition = {
    id: "getPublicationContributors",
    name: "Get Publication Contributors",
    description: "Get the list of contributors for a publication including their roles",
    category: "publication",
    inputSchema: getPublicationContributorsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPublicationContributors(
    client: MediumClient,
    params: GetPublicationContributorsParams
): Promise<OperationResult> {
    try {
        const response = await client.getPublicationContributors(params.publicationId);
        const contributors = response.data || [];

        return {
            success: true,
            data: {
                contributors: contributors.map((contributor) => ({
                    publicationId: contributor.publicationId,
                    userId: contributor.userId,
                    role: contributor.role
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to get publication contributors",
                retryable: true
            }
        };
    }
}
