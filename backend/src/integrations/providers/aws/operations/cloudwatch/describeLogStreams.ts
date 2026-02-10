import { z } from "zod";
import { LogGroupNameSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Describe Log Streams operation schema
 */
export const describeLogStreamsSchema = z.object({
    logGroupName: LogGroupNameSchema,
    logStreamNamePrefix: z.string().optional().describe("Log stream name prefix filter"),
    orderBy: z
        .enum(["LogStreamName", "LastEventTime"])
        .default("LogStreamName")
        .describe("Sort order"),
    descending: z.boolean().default(false).describe("Sort in descending order"),
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type DescribeLogStreamsParams = z.infer<typeof describeLogStreamsSchema>;

/**
 * Describe Log Streams operation definition
 */
export const describeLogStreamsOperation: OperationDefinition = {
    id: "cloudwatch_describeLogStreams",
    name: "List CloudWatch Log Streams",
    description: "List log streams in a log group",
    category: "cloudwatch",
    inputSchema: describeLogStreamsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute describe log streams operation
 */
export async function executeDescribeLogStreams(
    client: AWSClient,
    params: DescribeLogStreamsParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            logGroupName: params.logGroupName,
            orderBy: params.orderBy,
            descending: params.descending
        };

        if (params.logStreamNamePrefix) {
            requestBody.logStreamNamePrefix = params.logStreamNamePrefix;
        }

        if (params.maxResults) {
            requestBody.limit = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        const response = await client.logs.request<{
            logStreams: Array<{
                logStreamName: string;
                creationTime: number;
                firstEventTimestamp?: number;
                lastEventTimestamp?: number;
                lastIngestionTime?: number;
                uploadSequenceToken?: string;
                arn: string;
                storedBytes?: number;
            }>;
            nextToken?: string;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "Logs_20140328.DescribeLogStreams",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                logGroupName: params.logGroupName,
                logStreams: response.logStreams.map((stream) => ({
                    logStreamName: stream.logStreamName,
                    arn: stream.arn,
                    creationTime: new Date(stream.creationTime).toISOString(),
                    firstEventTimestamp: stream.firstEventTimestamp
                        ? new Date(stream.firstEventTimestamp).toISOString()
                        : undefined,
                    lastEventTimestamp: stream.lastEventTimestamp
                        ? new Date(stream.lastEventTimestamp).toISOString()
                        : undefined,
                    lastIngestionTime: stream.lastIngestionTime
                        ? new Date(stream.lastIngestionTime).toISOString()
                        : undefined,
                    uploadSequenceToken: stream.uploadSequenceToken,
                    storedBytes: stream.storedBytes
                })),
                nextToken: response.nextToken,
                streamCount: response.logStreams.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to describe log streams",
                retryable: true
            }
        };
    }
}
