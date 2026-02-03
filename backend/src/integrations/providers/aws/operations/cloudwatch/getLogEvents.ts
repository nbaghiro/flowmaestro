import { z } from "zod";
import { LogGroupNameSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Get Log Events operation schema
 */
export const getLogEventsSchema = z.object({
    logGroupName: LogGroupNameSchema,
    logStreamName: z.string().describe("Log stream name"),
    startTime: z.number().optional().describe("Start time in milliseconds since epoch"),
    endTime: z.number().optional().describe("End time in milliseconds since epoch"),
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Forward pagination token"),
    startFromHead: z
        .boolean()
        .default(true)
        .describe("Retrieve from oldest (true) or newest (false)")
});

export type GetLogEventsParams = z.infer<typeof getLogEventsSchema>;

/**
 * Get Log Events operation definition
 */
export const getLogEventsOperation: OperationDefinition = {
    id: "cloudwatch_getLogEvents",
    name: "Get CloudWatch Log Events",
    description: "Get log events from a specific log stream",
    category: "cloudwatch",
    inputSchema: getLogEventsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get log events operation
 */
export async function executeGetLogEvents(
    client: AWSClient,
    params: GetLogEventsParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            logGroupName: params.logGroupName,
            logStreamName: params.logStreamName,
            startFromHead: params.startFromHead
        };

        if (params.startTime !== undefined) {
            requestBody.startTime = params.startTime;
        }

        if (params.endTime !== undefined) {
            requestBody.endTime = params.endTime;
        }

        if (params.maxResults) {
            requestBody.limit = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        const response = await client.logs.request<{
            events: Array<{
                timestamp: number;
                message: string;
                ingestionTime: number;
            }>;
            nextForwardToken?: string;
            nextBackwardToken?: string;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "Logs_20140328.GetLogEvents",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                logGroupName: params.logGroupName,
                logStreamName: params.logStreamName,
                events: response.events.map((event) => ({
                    timestamp: new Date(event.timestamp).toISOString(),
                    message: event.message,
                    ingestionTime: new Date(event.ingestionTime).toISOString()
                })),
                nextForwardToken: response.nextForwardToken,
                nextBackwardToken: response.nextBackwardToken,
                eventCount: response.events.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get log events",
                retryable: true
            }
        };
    }
}
