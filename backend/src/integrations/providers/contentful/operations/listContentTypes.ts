import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const listContentTypesSchema = z.object({
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type ListContentTypesParams = z.infer<typeof listContentTypesSchema>;

export const listContentTypesOperation: OperationDefinition = {
    id: "listContentTypes",
    name: "List Content Types",
    description: "List all content types in a Contentful space and environment",
    category: "data",
    inputSchema: listContentTypesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListContentTypes(
    client: ContentfulClient,
    params: ListContentTypesParams
): Promise<OperationResult> {
    try {
        const response = await client.listContentTypes(params.environmentId);

        const contentTypes = response.items.map((ct) => ({
            id: ct.sys.id,
            name: ct.name,
            description: ct.description,
            displayField: ct.displayField,
            fields: ct.fields.map((f) => ({
                id: f.id,
                name: f.name,
                type: f.type,
                required: f.required,
                localized: f.localized
            }))
        }));

        return {
            success: true,
            data: {
                contentTypes,
                total: response.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list content types",
                retryable: true
            }
        };
    }
}
