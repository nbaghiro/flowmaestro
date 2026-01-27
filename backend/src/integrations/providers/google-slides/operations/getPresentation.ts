import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Get presentation input schema
 */
export const getPresentationSchema = z.object({
    presentationId: z.string().min(1).describe("The ID of the presentation to retrieve")
});

export type GetPresentationParams = z.infer<typeof getPresentationSchema>;

/**
 * Get presentation operation definition
 */
export const getPresentationOperation: OperationDefinition = {
    id: "getPresentation",
    name: "Get Presentation",
    description:
        "Retrieve a Google Slides presentation by ID, including its slides, masters, and layouts",
    category: "presentations",
    retryable: true,
    inputSchema: getPresentationSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            presentationId: {
                type: "string",
                description: "The ID of the presentation to retrieve"
            }
        },
        required: ["presentationId"]
    }
};

interface PresentationResponse {
    presentationId: string;
    title: string;
    slides?: unknown[];
    masters?: unknown[];
    layouts?: unknown[];
    pageSize?: {
        width?: { magnitude: number; unit: string };
        height?: { magnitude: number; unit: string };
    };
    revisionId?: string;
}

/**
 * Execute get presentation operation
 */
export async function executeGetPresentation(
    client: GoogleSlidesClient,
    params: GetPresentationParams
): Promise<OperationResult> {
    try {
        const response = (await client.getPresentation(
            params.presentationId
        )) as PresentationResponse;

        return {
            success: true,
            data: {
                presentationId: response.presentationId,
                title: response.title,
                slides: response.slides,
                masters: response.masters,
                layouts: response.layouts,
                pageSize: response.pageSize,
                presentationUrl: `https://docs.google.com/presentation/d/${response.presentationId}/edit`,
                revisionId: response.revisionId,
                slideCount: response.slides?.length || 0
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get presentation",
                retryable: true
            }
        };
    }
}
