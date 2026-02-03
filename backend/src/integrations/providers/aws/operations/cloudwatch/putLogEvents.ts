import { z } from "zod";
import { LogGroupNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Put Log Events operation schema
 */
export const putLogEventsSchema = z.object({
    logGroupName: LogGroupNameSchema,
    logStreamName: z.string().describe("Log stream name"),
    logEvents: z
        .array(
            z.object({
                message: z.string().describe("Log message"),
                timestamp: z.number().describe("Timestamp in milliseconds since epoch")
            })
        )
        .min(1)
        .max(10000)
        .describe("Log events to write (1-10000)"),
    sequenceToken: z.string().optional().describe("Sequence token from previous put")
});

export type PutLogEventsParams = z.infer<typeof putLogEventsSchema>;

/**
 * Put Log Events operation definition
 */
export const putLogEventsOperation: OperationDefinition = {
    id: "cloudwatch_putLogEvents",
    name: "Write CloudWatch Log Events",
    description: "Write log events to a log stream",
    category: "cloudwatch",
    inputSchema: putLogEventsSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute put log events operation
 */
export async function executePutLogEvents(
    client: AWSClient,
    params: PutLogEventsParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            logGroupName: params.logGroupName,
            logStreamName: params.logStreamName,
            logEvents: params.logEvents.map((event) => ({
                message: event.message,
                timestamp: event.timestamp
            }))
        };

        if (params.sequenceToken) {
            requestBody.sequenceToken = params.sequenceToken;
        }

        const response = await client.logs.request<{
            nextSequenceToken: string;
            rejectedLogEventsInfo?: {
                tooNewLogEventStartIndex?: number;
                tooOldLogEventEndIndex?: number;
                expiredLogEventEndIndex?: number;
            };
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "Logs_20140328.PutLogEvents",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                logGroupName: params.logGroupName,
                logStreamName: params.logStreamName,
                nextSequenceToken: response.nextSequenceToken,
                eventsWritten: params.logEvents.length,
                rejectedLogEventsInfo: response.rejectedLogEventsInfo,
                writtenAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to write log events",
                retryable: false
            }
        };
    }
}
