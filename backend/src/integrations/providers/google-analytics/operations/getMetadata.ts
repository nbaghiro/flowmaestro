import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleAnalyticsClient } from "../client/GoogleAnalyticsClient";

/**
 * Get metadata input schema
 */
export const getMetadataSchema = z.object({
    propertyId: z
        .string()
        .min(1)
        .describe("GA4 property ID (numeric ID only, without 'properties/' prefix)")
});

export type GetMetadataParams = z.infer<typeof getMetadataSchema>;

/**
 * Get metadata operation definition
 */
export const getMetadataOperation: OperationDefinition = {
    id: "getMetadata",
    name: "Get Metadata",
    description: "Get available dimensions and metrics for a property",
    category: "data",
    retryable: true,
    inputSchema: getMetadataSchema
};

/**
 * Execute get metadata operation
 */
export async function executeGetMetadata(
    client: GoogleAnalyticsClient,
    params: GetMetadataParams
): Promise<OperationResult> {
    try {
        const response = await client.getMetadata({
            propertyId: params.propertyId
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get metadata",
                retryable: true
            }
        };
    }
}
