import { z } from "zod";
import { LogGroupNameSchema, ISO8601TimestampSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Query Logs operation schema
 */
export const queryLogsSchema = z.object({
    logGroupName: LogGroupNameSchema,
    filterPattern: z.string().optional().describe("CloudWatch Logs filter pattern"),
    startTime: ISO8601TimestampSchema.optional().describe("Start of time range"),
    endTime: ISO8601TimestampSchema.optional().describe("End of time range"),
    logStreamNames: z.array(z.string()).optional().describe("Specific log streams to search"),
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type QueryLogsParams = z.infer<typeof queryLogsSchema>;

/**
 * Query Logs operation definition
 */
export const queryLogsOperation: OperationDefinition = {
    id: "cloudwatch_queryLogs",
    name: "Query CloudWatch Logs",
    description: "Search CloudWatch Logs with filters and time range",
    category: "cloudwatch",
    inputSchema: queryLogsSchema,
    retryable: true,
    timeout: 30000
};

interface LogEvent {
    timestamp: number;
    message: string;
    logStreamName: string;
    eventId: string;
    ingestionTime: number;
}

/**
 * Execute query logs operation
 */
export async function executeQueryLogs(
    client: AWSClient,
    params: QueryLogsParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            logGroupName: params.logGroupName
        };

        if (params.filterPattern) {
            requestBody.filterPattern = params.filterPattern;
        }

        if (params.startTime) {
            requestBody.startTime = new Date(params.startTime).getTime();
        }

        if (params.endTime) {
            requestBody.endTime = new Date(params.endTime).getTime();
        }

        if (params.logStreamNames && params.logStreamNames.length > 0) {
            requestBody.logStreamNames = params.logStreamNames;
        }

        if (params.maxResults) {
            requestBody.limit = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        const response = await client.logs.request<{
            events: LogEvent[];
            nextToken?: string;
            searchedLogStreams: Array<{
                logStreamName: string;
                searchedCompletely: boolean;
            }>;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "Logs_20140328.FilterLogEvents",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                logGroupName: params.logGroupName,
                events: response.events.map((event) => ({
                    timestamp: new Date(event.timestamp).toISOString(),
                    message: event.message,
                    logStreamName: event.logStreamName,
                    eventId: event.eventId,
                    ingestionTime: new Date(event.ingestionTime).toISOString()
                })),
                nextToken: response.nextToken,
                eventCount: response.events.length,
                logStreamsSearched: response.searchedLogStreams.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query logs",
                retryable: true
            }
        };
    }
}
