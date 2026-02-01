import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const listTagsSchema = z.object({});

export type ListTagsParams = z.infer<typeof listTagsSchema>;

export const listTagsOperation: OperationDefinition = {
    id: "listTags",
    name: "List Tags",
    description:
        "List all tags in your Evernote account. Returns tag names, GUIDs, and hierarchy information.",
    category: "tags",
    actionType: "read",
    inputSchema: listTagsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTags(
    client: EvernoteClient,
    _params: ListTagsParams
): Promise<OperationResult> {
    try {
        const tags = await client.listTags();

        // Transform to cleaner format
        const items = tags.map((tag) => ({
            guid: tag.guid,
            name: tag.name,
            parentGuid: tag.parentGuid
        }));

        return {
            success: true,
            data: {
                tagCount: items.length,
                tags: items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tags",
                retryable: true
            }
        };
    }
}
