import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MediumClient } from "../client/MediumClient";

export const getPublicationsSchema = z.object({
    userId: z.string().describe("The user ID to get publications for")
});

export type GetPublicationsParams = z.infer<typeof getPublicationsSchema>;

export const getPublicationsOperation: OperationDefinition = {
    id: "getPublications",
    name: "Get Publications",
    description: "Get the list of publications the user has contributed to or owns",
    category: "publication",
    inputSchema: getPublicationsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPublications(
    client: MediumClient,
    params: GetPublicationsParams
): Promise<OperationResult> {
    try {
        const response = await client.getPublications(params.userId);
        const publications = response.data || [];

        return {
            success: true,
            data: {
                publications: publications.map((pub) => ({
                    id: pub.id,
                    name: pub.name,
                    description: pub.description,
                    url: pub.url,
                    imageUrl: pub.imageUrl
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get publications",
                retryable: true
            }
        };
    }
}
