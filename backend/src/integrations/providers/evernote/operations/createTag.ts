import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const createTagSchema = z.object({
    name: z.string().min(1).max(100).describe("Name of the tag to create"),
    parentGuid: z
        .string()
        .optional()
        .describe("Optional GUID of a parent tag to create a nested tag hierarchy")
});

export type CreateTagParams = z.infer<typeof createTagSchema>;

export const createTagOperation: OperationDefinition = {
    id: "createTag",
    name: "Create Tag",
    description:
        "Create a new tag in your Evernote account. Tags can be nested by specifying a parent tag GUID.",
    category: "tags",
    actionType: "write",
    inputSchema: createTagSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateTag(
    client: EvernoteClient,
    params: CreateTagParams
): Promise<OperationResult> {
    try {
        const tag = await client.createTag(params.name, params.parentGuid);

        return {
            success: true,
            data: {
                guid: tag.guid,
                name: tag.name,
                parentGuid: tag.parentGuid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create tag",
                retryable: false
            }
        };
    }
}
