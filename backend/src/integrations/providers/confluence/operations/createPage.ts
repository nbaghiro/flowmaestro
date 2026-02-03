import { createPageInputSchema, type CreatePageInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const createPageOperation: OperationDefinition = {
    id: "createPage",
    name: "Create Page",
    description: "Create a new page in a Confluence space",
    category: "pages",
    inputSchema: createPageInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreatePage(
    client: ConfluenceClient,
    params: CreatePageInput
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            spaceId: params.spaceId,
            title: params.title,
            body: {
                representation: "storage",
                value: params.body
            }
        };

        if (params.parentId) {
            body.parentId = params.parentId;
        }

        if (params.status) {
            body.status = params.status;
        }

        const response = await client.post<{
            id: string;
            title: string;
            status: string;
            spaceId: string;
            version?: { number: number };
            _links?: { webui?: string };
        }>("/wiki/api/v2/pages", body);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create page",
                retryable: true
            }
        };
    }
}
