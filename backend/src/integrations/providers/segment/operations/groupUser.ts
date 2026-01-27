import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SegmentClient } from "../client/SegmentClient";
import {
    SegmentUserIdSchema,
    SegmentAnonymousIdSchema,
    SegmentGroupIdSchema,
    SegmentTraitsSchema,
    SegmentContextSchema,
    SegmentTimestampSchema,
    SegmentMessageIdSchema,
    SegmentIntegrationsSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Group User operation schema
 *
 * The group call lets you associate an individual user with a group,
 * such as a company, organization, account, project, or team.
 *
 * https://segment.com/docs/connections/spec/group/
 */
export const groupUserSchema = z
    .object({
        userId: SegmentUserIdSchema,
        anonymousId: SegmentAnonymousIdSchema,
        groupId: SegmentGroupIdSchema,
        traits: SegmentTraitsSchema,
        context: SegmentContextSchema,
        integrations: SegmentIntegrationsSchema,
        timestamp: SegmentTimestampSchema,
        messageId: SegmentMessageIdSchema
    })
    .refine((data) => data.userId || data.anonymousId, {
        message: "Either userId or anonymousId is required"
    });

export type GroupUserParams = z.infer<typeof groupUserSchema>;

/**
 * Group User operation definition
 */
export const groupUserOperation: OperationDefinition = {
    id: "groupUser",
    name: "Group User",
    description:
        "Associate a user with a group/organization. Use this to link users to companies, accounts, projects, or teams.",
    category: "users",
    actionType: "write",
    inputSchema: groupUserSchema,
    inputSchemaJSON: toJSONSchema(groupUserSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute group user operation
 */
export async function executeGroupUser(
    client: SegmentClient,
    params: GroupUserParams
): Promise<OperationResult> {
    try {
        // Build the group payload
        const payload: Record<string, unknown> = {
            groupId: params.groupId
        };

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

        const response = await client.group(payload);

        return {
            success: true,
            data: {
                success: response.success,
                groupId: params.groupId,
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
                message: error instanceof Error ? error.message : "Failed to group user",
                retryable: true
            }
        };
    }
}
