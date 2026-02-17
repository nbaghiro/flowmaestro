import { z } from "zod";
import type { ConvertKitTagOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const createTagSchema = z.object({
    name: z.string().min(1).describe("Tag name to create")
});

export type CreateTagParams = z.infer<typeof createTagSchema>;

export const createTagOperation: OperationDefinition = {
    id: "createTag",
    name: "Create Tag",
    description: "Create a new tag in ConvertKit",
    category: "tags",
    inputSchema: createTagSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateTag(
    client: ConvertKitClient,
    params: CreateTagParams
): Promise<OperationResult> {
    try {
        const response = await client.createTag(params.name);

        const output: ConvertKitTagOutput = {
            id: String(response.tag.id),
            name: response.tag.name,
            createdAt: response.tag.created_at
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create tag";
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
