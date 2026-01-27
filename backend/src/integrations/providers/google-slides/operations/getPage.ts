import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Get page input schema
 */
export const getPageSchema = z.object({
    presentationId: z.string().min(1).describe("The ID of the presentation"),
    pageObjectId: z.string().min(1).describe("The object ID of the page (slide) to retrieve")
});

export type GetPageParams = z.infer<typeof getPageSchema>;

/**
 * Get page operation definition
 */
export const getPageOperation: OperationDefinition = {
    id: "getPage",
    name: "Get Page",
    description: "Retrieve a specific page (slide) from a Google Slides presentation",
    category: "pages",
    retryable: true,
    inputSchema: getPageSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            presentationId: {
                type: "string",
                description: "The ID of the presentation"
            },
            pageObjectId: {
                type: "string",
                description: "The object ID of the page (slide) to retrieve"
            }
        },
        required: ["presentationId", "pageObjectId"]
    }
};

interface PageResponse {
    objectId: string;
    pageType?: string;
    pageElements?: unknown[];
    slideProperties?: unknown;
    layoutProperties?: unknown;
    masterProperties?: unknown;
    pageProperties?: unknown;
}

/**
 * Execute get page operation
 */
export async function executeGetPage(
    client: GoogleSlidesClient,
    params: GetPageParams
): Promise<OperationResult> {
    try {
        const response = (await client.getPage(
            params.presentationId,
            params.pageObjectId
        )) as PageResponse;

        return {
            success: true,
            data: {
                objectId: response.objectId,
                pageType: response.pageType,
                pageElements: response.pageElements,
                slideProperties: response.slideProperties,
                layoutProperties: response.layoutProperties,
                masterProperties: response.masterProperties,
                pageProperties: response.pageProperties,
                elementCount: response.pageElements?.length || 0
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get page",
                retryable: true
            }
        };
    }
}
