import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Delete presentation input schema
 */
export const deletePresentationSchema = z.object({
    presentationId: z.string().min(1).describe("The ID of the presentation to delete")
});

export type DeletePresentationParams = z.infer<typeof deletePresentationSchema>;

/**
 * Delete presentation operation definition
 */
export const deletePresentationOperation: OperationDefinition = {
    id: "deletePresentation",
    name: "Delete Presentation",
    description: "Delete a Google Slides presentation (moves to trash)",
    category: "presentations",
    retryable: false,
    inputSchema: deletePresentationSchema
};

/**
 * Execute delete presentation operation
 */
export async function executeDeletePresentation(
    client: GoogleSlidesClient,
    params: DeletePresentationParams
): Promise<OperationResult> {
    try {
        await client.deletePresentation(params.presentationId);

        return {
            success: true,
            data: {
                deleted: true,
                presentationId: params.presentationId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete presentation",
                retryable: true
            }
        };
    }
}
