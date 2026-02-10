import { z } from "zod";
import { LogGroupNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Create Log Group operation schema
 */
export const createLogGroupSchema = z.object({
    logGroupName: LogGroupNameSchema,
    tags: z.record(z.string()).optional().describe("Tags for the log group")
});

export type CreateLogGroupParams = z.infer<typeof createLogGroupSchema>;

/**
 * Create Log Group operation definition
 */
export const createLogGroupOperation: OperationDefinition = {
    id: "cloudwatch_createLogGroup",
    name: "Create CloudWatch Log Group",
    description: "Create a new CloudWatch log group",
    category: "cloudwatch",
    inputSchema: createLogGroupSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create log group operation
 */
export async function executeCreateLogGroup(
    client: AWSClient,
    params: CreateLogGroupParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            logGroupName: params.logGroupName
        };

        if (params.tags && Object.keys(params.tags).length > 0) {
            requestBody.tags = params.tags;
        }

        await client.logs.request({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "Logs_20140328.CreateLogGroup",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                logGroupName: params.logGroupName,
                message: "Log group created successfully",
                createdAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create log group",
                retryable: false
            }
        };
    }
}
