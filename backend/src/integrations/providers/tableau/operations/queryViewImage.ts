import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import {
    TableauViewIdSchema,
    TableauResolutionSchema,
    TableauWidthSchema,
    TableauHeightSchema
} from "./schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Query View Image operation schema
 */
export const queryViewImageSchema = z.object({
    view_id: TableauViewIdSchema,
    resolution: TableauResolutionSchema,
    width: TableauWidthSchema,
    height: TableauHeightSchema
});

export type QueryViewImageParams = z.infer<typeof queryViewImageSchema>;

/**
 * Query View Image operation definition
 */
export const queryViewImageOperation: OperationDefinition = {
    id: "queryViewImage",
    name: "Query View Image",
    description: "Get the view as a PNG image",
    category: "views",
    inputSchema: queryViewImageSchema,
    retryable: true,
    timeout: 120000
};

/**
 * Execute query view image operation
 */
export async function executeQueryViewImage(
    client: TableauClient,
    params: QueryViewImageParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            resolution: params.resolution
        };

        if (params.width) {
            queryParams.width = params.width.toString();
        }

        if (params.height) {
            queryParams.height = params.height.toString();
        }

        // Note: This endpoint returns binary PNG data
        // In a real implementation, you'd handle the binary response
        const imageUrl = client.makeSitePath(`/views/${params.view_id}/image`);

        return {
            success: true,
            data: {
                format: "png",
                image_url: imageUrl,
                resolution: params.resolution,
                width: params.width,
                height: params.height,
                note: "Use the image_url with the X-Tableau-Auth header to fetch the image"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query view image",
                retryable: true
            }
        };
    }
}
