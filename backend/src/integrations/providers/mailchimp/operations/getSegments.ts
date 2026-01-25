import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpSegmentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getSegmentsSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    count: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of segments to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of segments to skip"),
    type: z.enum(["saved", "static", "fuzzy"]).optional().describe("Filter by segment type")
});

export type GetSegmentsParams = z.infer<typeof getSegmentsSchema>;

export const getSegmentsOperation: OperationDefinition = {
    id: "getSegments",
    name: "Get Segments",
    description: "Get all segments from a Mailchimp audience",
    category: "segments",
    inputSchema: getSegmentsSchema,
    inputSchemaJSON: toJSONSchema(getSegmentsSchema),
    retryable: true,
    timeout: 15000
};

export async function executeGetSegments(
    client: MailchimpClient,
    params: GetSegmentsParams
): Promise<OperationResult> {
    try {
        const response = await client.getSegments(params.listId, {
            count: params.count,
            offset: params.offset,
            type: params.type
        });

        const segments: MailchimpSegmentOutput[] = response.segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            memberCount: segment.member_count,
            type: segment.type,
            createdAt: segment.created_at,
            updatedAt: segment.updated_at
        }));

        return {
            success: true,
            data: {
                segments,
                totalItems: response.total_items,
                hasMore: (params.offset || 0) + segments.length < response.total_items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get segments",
                retryable: true
            }
        };
    }
}
