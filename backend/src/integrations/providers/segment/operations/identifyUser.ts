import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SegmentClient } from "../client/SegmentClient";
import {
    SegmentUserIdSchema,
    SegmentAnonymousIdSchema,
    SegmentTraitsSchema,
    SegmentContextSchema,
    SegmentTimestampSchema,
    SegmentMessageIdSchema,
    SegmentIntegrationsSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Identify User operation schema
 *
 * Identify lets you tie a user to their actions and record traits about them.
 * It includes a unique User ID and any optional traits you know about the user,
 * like their email, name, or address.
 *
 * https://segment.com/docs/connections/spec/identify/
 */
export const identifyUserSchema = z
    .object({
        userId: SegmentUserIdSchema,
        anonymousId: SegmentAnonymousIdSchema,
        traits: SegmentTraitsSchema,
        context: SegmentContextSchema,
        integrations: SegmentIntegrationsSchema,
        timestamp: SegmentTimestampSchema,
        messageId: SegmentMessageIdSchema
    })
    .refine((data) => data.userId || data.anonymousId, {
        message: "Either userId or anonymousId is required"
    });

export type IdentifyUserParams = z.infer<typeof identifyUserSchema>;

/**
 * Identify User operation definition
 */
export const identifyUserOperation: OperationDefinition = {
    id: "identifyUser",
    name: "Identify User",
    description:
        "Identify a user and set their traits. Use this to associate a user with their actions and store traits like email, name, plan, etc.",
    category: "users",
    actionType: "write",
    inputSchema: identifyUserSchema,
    inputSchemaJSON: toJSONSchema(identifyUserSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute identify user operation
 */
export async function executeIdentifyUser(
    client: SegmentClient,
    params: IdentifyUserParams
): Promise<OperationResult> {
    try {
        // Build the identify payload
        const payload: Record<string, unknown> = {};

        // Add user identifiers
        if (params.userId) {
            payload.userId = params.userId;
        }
        if (params.anonymousId) {
            payload.anonymousId = params.anonymousId;
        }

        // Add optional fields
        if (params.traits) {
            payload.traits = params.traits;
        }
        if (params.context) {
            payload.context = params.context;
        }
        if (params.integrations) {
            payload.integrations = params.integrations;
        }
        if (params.timestamp) {
            payload.timestamp = params.timestamp;
        }
        if (params.messageId) {
            payload.messageId = params.messageId;
        }

        const response = await client.identify(payload);

        return {
            success: true,
            data: {
                success: response.success,
                userId: params.userId,
                anonymousId: params.anonymousId,
                traits: params.traits
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to identify user",
                retryable: true
            }
        };
    }
}
