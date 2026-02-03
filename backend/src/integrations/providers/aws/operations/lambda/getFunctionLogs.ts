import { z } from "zod";
import { LambdaFunctionNameSchema, ISO8601TimestampSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Get Function Logs operation schema
 */
export const getFunctionLogsSchema = z.object({
    functionName: LambdaFunctionNameSchema,
    startTime: ISO8601TimestampSchema.optional().describe("Start of time range"),
    endTime: ISO8601TimestampSchema.optional().describe("End of time range"),
    filterPattern: z.string().optional().describe("CloudWatch Logs filter pattern"),
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type GetFunctionLogsParams = z.infer<typeof getFunctionLogsSchema>;

/**
 * Get Function Logs operation definition
 */
export const getFunctionLogsOperation: OperationDefinition = {
    id: "lambda_getFunctionLogs",
    name: "Get Lambda Function Logs",
    description: "Query CloudWatch logs for a Lambda function",
    category: "lambda",
    inputSchema: getFunctionLogsSchema,
    retryable: true,
    timeout: 30000
};

interface LogEvent {
    timestamp: number;
    message: string;
    ingestionTime: number;
}

/**
 * Execute get function logs operation
 */
export async function executeGetFunctionLogs(
    client: AWSClient,
    params: GetFunctionLogsParams
): Promise<OperationResult> {
    try {
        // CloudWatch log group name for Lambda functions
        const logGroupName = `/aws/lambda/${params.functionName}`;

        // Build request body for FilterLogEvents
        const requestBody: Record<string, unknown> = {
            logGroupName
        };

        if (params.startTime) {
            requestBody.startTime = new Date(params.startTime).getTime();
        }

        if (params.endTime) {
            requestBody.endTime = new Date(params.endTime).getTime();
        }

        if (params.filterPattern) {
            requestBody.filterPattern = params.filterPattern;
        }

        if (params.maxResults) {
            requestBody.limit = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        // Use CloudWatch Logs API
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
                functionName: params.functionName,
                logGroupName,
                events: response.events.map((event) => ({
                    timestamp: new Date(event.timestamp).toISOString(),
                    message: event.message,
                    ingestionTime: new Date(event.ingestionTime).toISOString()
                })),
                nextToken: response.nextToken,
                logStreamsSearched: response.searchedLogStreams.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get Lambda function logs",
                retryable: true
            }
        };
    }
}
