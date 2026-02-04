import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const listSpacesSchema = z.object({});

export type ListSpacesParams = z.infer<typeof listSpacesSchema>;

export const listSpacesOperation: OperationDefinition = {
    id: "listSpaces",
    name: "List Spaces",
    description: "List all accessible Contentful spaces",
    category: "data",
    inputSchema: listSpacesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListSpaces(
    client: ContentfulClient,
    _params: ListSpacesParams
): Promise<OperationResult> {
    try {
        const response = await client.listSpaces();

        const spaces = response.items.map((space) => ({
            id: space.sys.id,
            name: space.name
        }));

        return {
            success: true,
            data: {
                spaces,
                total: response.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list spaces",
                retryable: true
            }
        };
    }
}
