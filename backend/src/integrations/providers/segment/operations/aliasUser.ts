import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SegmentClient } from "../client/SegmentClient";
import {
    SegmentUserIdSchema,
    SegmentAnonymousIdSchema,
    SegmentPreviousIdSchema,
    SegmentContextSchema,
    SegmentTimestampSchema,
    SegmentMessageIdSchema,
    SegmentIntegrationsSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Alias User operation schema
 *
 * The alias call lets you merge two user identities, effectively saying
 * that one user is the same as another user.
 *
 * https://segment.com/docs/connections/spec/alias/
 */
export const aliasUserSchema = z
    .object({
        userId: SegmentUserIdSchema,
        anonymousId: SegmentAnonymousIdSchema,
        previousId: SegmentPreviousIdSchema,
        context: SegmentContextSchema,
        integrations: SegmentIntegrationsSchema,
        timestamp: SegmentTimestampSchema,
        messageId: SegmentMessageIdSchema
    })
    .refine((data) => data.userId || data.anonymousId, {
        message: "Either userId or anonymousId is required"
    });

export type AliasUserParams = z.infer<typeof aliasUserSchema>;

/**
 * Alias User operation definition
 */
export const aliasUserOperation: OperationDefinition = {
    id: "aliasUser",
    name: "Alias User",
    description:
        "Link two user identities together. Use this to merge an anonymous user with a known user after they sign up or log in.",
    category: "users",
    actionType: "write",
    inputSchema: aliasUserSchema,
    inputSchemaJSON: toJSONSchema(aliasUserSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute alias user operation
 */
export async function executeAliasUser(
    client: SegmentClient,
    params: AliasUserParams
): Promise<OperationResult> {
    try {
        // Build the alias payload
        const payload: Record<string, unknown> = {
            previousId: params.previousId
        };

        // Add user identifiers
        if (params.userId) {
            payload.userId = params.userId;
        }
        if (params.anonymousId) {
            payload.anonymousId = params.anonymousId;
        }

        // Add optional fields
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

        const response = await client.alias(payload);

        return {
            success: true,
            data: {
                success: response.success,
                userId: params.userId,
                anonymousId: params.anonymousId,
                previousId: params.previousId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to alias user",
                retryable: true
            }
        };
    }
}
