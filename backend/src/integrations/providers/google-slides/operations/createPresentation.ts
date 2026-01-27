import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Create presentation input schema
 */
export const createPresentationSchema = z.object({
    title: z.string().min(1).max(256).describe("Presentation title")
});

export type CreatePresentationParams = z.infer<typeof createPresentationSchema>;

/**
 * Create presentation operation definition
 */
export const createPresentationOperation: OperationDefinition = {
    id: "createPresentation",
    name: "Create Presentation",
    description: "Create a new Google Slides presentation",
    category: "presentations",
    retryable: true,
    inputSchema: createPresentationSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Presentation title"
            }
        },
        required: ["title"]
    }
};

interface CreatePresentationResponse {
    presentationId: string;
    title: string;
    revisionId?: string;
    slides?: unknown[];
}

/**
 * Execute create presentation operation
 */
export async function executeCreatePresentation(
    client: GoogleSlidesClient,
    params: CreatePresentationParams
): Promise<OperationResult> {
    try {
        const response = (await client.createPresentation(
            params.title
        )) as CreatePresentationResponse;

        return {
            success: true,
            data: {
                presentationId: response.presentationId,
                title: response.title,
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
                message: error instanceof Error ? error.message : "Failed to create presentation",
                retryable: true
            }
        };
    }
}
