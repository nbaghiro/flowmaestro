import { updatePageInputSchema, type UpdatePageInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const updatePageOperation: OperationDefinition = {
    id: "updatePage",
    name: "Update Page",
    description:
        "Update an existing Confluence page. Requires current version number for optimistic concurrency.",
    category: "pages",
    inputSchema: updatePageInputSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdatePage(
    client: ConfluenceClient,
    params: UpdatePageInput
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            id: params.pageId,
            title: params.title,
            body: {
                representation: "storage",
                value: params.body
            },
            version: {
                number: params.version + 1,
                message: "Updated via FlowMaestro"
            }
        };

        if (params.status) {
            body.status = params.status;
        }

        const response = await client.put<{
            id: string;
            title: string;
            status: string;
            spaceId: string;
            version?: { number: number };
            _links?: { webui?: string };
        }>(`/wiki/api/v2/pages/${params.pageId}`, body);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update page",
                retryable: false
            }
        };
    }
}
