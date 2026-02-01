import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SlackClient } from "../client/SlackClient";
import {
    SlackChannelSchema,
    SlackTextSchema,
    SlackThreadTsSchema,
    SlackBlocksSchema
} from "../schemas";
import type { SlackMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Message operation schema
 */
export const sendMessageSchema = z.object({
    channel: SlackChannelSchema,
    text: SlackTextSchema,
    thread_ts: SlackThreadTsSchema,
    blocks: SlackBlocksSchema
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

/**
 * Send Message operation definition
 */
export const sendMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendMessage",
            name: "Send Message",
            description: "Send a message to a Slack channel or direct message",
            category: "messaging",
            inputSchema: sendMessageSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Slack", err: error }, "Failed to create sendMessageOperation");
        throw new Error(
            `Failed to create sendMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send message operation
 */
export async function executeSendMessage(
    client: SlackClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.postMessage({
            channel: params.channel,
            text: params.text,
            thread_ts: params.thread_ts,
            blocks: params.blocks
        });

        const data = response as SlackMessageResponse;

        return {
            success: true,
            data: {
                messageId: data.ts,
                channel: data.channel,
                threadTimestamp: data.ts
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: true
            }
        };
    }
}
