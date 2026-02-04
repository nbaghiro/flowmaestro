import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const listAssetsSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Maximum number of assets to return (1-1000, default: 100)"),
    skip: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("Number of assets to skip for pagination"),
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type ListAssetsParams = z.infer<typeof listAssetsSchema>;

export const listAssetsOperation: OperationDefinition = {
    id: "listAssets",
    name: "List Assets",
    description: "List assets in a Contentful space and environment",
    category: "data",
    inputSchema: listAssetsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListAssets(
    client: ContentfulClient,
    params: ListAssetsParams
): Promise<OperationResult> {
    try {
        const response = await client.listAssets(
            {
                limit: params.limit,
                skip: params.skip
            },
            params.environmentId
        );

        const defaultLocale = "en-US";
        const assets = response.items.map((asset) => {
            const file = asset.fields.file?.[defaultLocale];
            return {
                id: asset.sys.id,
                title: asset.fields.title?.[defaultLocale],
                description: asset.fields.description?.[defaultLocale],
                fileName: file?.fileName,
                contentType: file?.contentType,
                url: file?.url ? `https:${file.url}` : undefined,
                size: file?.details?.size,
                width: file?.details?.image?.width,
                height: file?.details?.image?.height,
                createdAt: asset.sys.createdAt,
                updatedAt: asset.sys.updatedAt
            };
        });

        return {
            success: true,
            data: {
                assets,
                total: response.total,
                skip: response.skip,
                limit: response.limit
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list assets",
                retryable: true
            }
        };
    }
}
