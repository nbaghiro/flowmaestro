import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HootsuiteClient } from "../client/HootsuiteClient";
import {
    HootsuiteSocialProfileIdSchema,
    HootsuiteTextSchema,
    HootsuiteScheduledSendTimeSchema,
    HootsuiteMediaUrlsSchema,
    HootsuiteMessageStateSchema
} from "../schemas";
import type { HootsuiteMessage } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Schedule Message operation schema
 */
export const scheduleMessageSchema = z.object({
    socialProfileIds: z
        .array(HootsuiteSocialProfileIdSchema)
        .min(1)
        .describe("Array of social profile IDs to post to"),
    text: HootsuiteTextSchema,
    scheduledSendTime: HootsuiteScheduledSendTimeSchema.optional(),
    mediaUrls: HootsuiteMediaUrlsSchema,
    state: HootsuiteMessageStateSchema.optional()
});

export type ScheduleMessageParams = z.infer<typeof scheduleMessageSchema>;

/**
 * Schedule Message operation definition
 */
export const scheduleMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "scheduleMessage",
            name: "Schedule Message",
            description: "Schedule a new post in Hootsuite",
            category: "messages",
            inputSchema: scheduleMessageSchema,
            inputSchemaJSON: toJSONSchema(scheduleMessageSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Hootsuite", err: error },
            "Failed to create scheduleMessageOperation"
        );
        throw new Error(
            `Failed to create scheduleMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute schedule message operation
 */
export async function executeScheduleMessage(
    client: HootsuiteClient,
    params: ScheduleMessageParams
): Promise<OperationResult> {
    try {
        const message = (await client.scheduleMessage({
            text: params.text,
            socialProfileIds: params.socialProfileIds,
            scheduledSendTime: params.scheduledSendTime,
            mediaUrls: params.mediaUrls,
            state: params.state
        })) as HootsuiteMessage;

        return {
            success: true,
            data: {
                id: message.id,
                state: message.state,
                text: message.text,
                socialProfileId: message.socialProfile?.id,
                scheduledSendTime: message.scheduledSendTime,
                createdAt: message.createdAt,
                mediaUrls: message.mediaUrls
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to schedule message",
                retryable: true
            }
        };
    }
}
