import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const publishEntrySchema = z.object({
    entryId: z.string().min(1).describe("The ID of the entry to publish or unpublish"),
    version: z
        .number()
        .int()
        .min(1)
        .describe("The current version of the entry (required for publishing)"),
    action: z
        .enum(["publish", "unpublish"])
        .default("publish")
        .describe("Whether to publish or unpublish the entry"),
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type PublishEntryParams = z.infer<typeof publishEntrySchema>;

export const publishEntryOperation: OperationDefinition = {
    id: "publishEntry",
    name: "Publish Entry",
    description: "Publish or unpublish a Contentful entry",
    category: "data",
    inputSchema: publishEntrySchema,
    retryable: false,
    timeout: 30000
};

export async function executePublishEntry(
    client: ContentfulClient,
    params: PublishEntryParams
): Promise<OperationResult> {
    try {
        let entry;

        if (params.action === "unpublish") {
            entry = await client.unpublishEntry(params.entryId, params.environmentId);
        } else {
            entry = await client.publishEntry(params.entryId, params.version, params.environmentId);
        }

        return {
            success: true,
            data: {
                id: entry.sys.id,
                contentTypeId: entry.sys.contentType?.sys.id,
                version: entry.sys.version,
                publishedAt: entry.sys.publishedAt,
                action: params.action
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : `Failed to ${params.action} entry`,
                retryable: false
            }
        };
    }
}
