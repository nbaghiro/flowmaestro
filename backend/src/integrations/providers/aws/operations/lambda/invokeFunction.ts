import { z } from "zod";
import { LambdaFunctionNameSchema, LambdaInvocationTypeSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Invoke Function operation schema
 */
export const invokeFunctionSchema = z.object({
    functionName: LambdaFunctionNameSchema,
    invocationType: LambdaInvocationTypeSchema.default("RequestResponse"),
    payload: z.record(z.unknown()).optional().describe("JSON payload to pass to the function"),
    logType: z.enum(["None", "Tail"]).default("None").describe("Include execution logs in response")
});

export type InvokeFunctionParams = z.infer<typeof invokeFunctionSchema>;

/**
 * Invoke Function operation definition
 */
export const invokeFunctionOperation: OperationDefinition = {
    id: "lambda_invokeFunction",
    name: "Invoke Lambda Function",
    description: "Trigger Lambda function execution (synchronous or asynchronous)",
    category: "lambda",
    inputSchema: invokeFunctionSchema,
    retryable: false,
    timeout: 300000 // Lambda max timeout is 15 minutes
};

/**
 * Execute invoke function operation
 */
export async function executeInvokeFunction(
    client: AWSClient,
    params: InvokeFunctionParams
): Promise<OperationResult> {
    try {
        const headers: Record<string, string> = {
            "X-Amz-Invocation-Type": params.invocationType
        };

        if (params.logType) {
            headers["X-Amz-Log-Type"] = params.logType;
        }

        const body = params.payload ? JSON.stringify(params.payload) : undefined;

        const response = await client.lambda.request({
            method: "POST",
            url: `/2015-03-31/functions/${encodeURIComponent(params.functionName)}/invocations`,
            data: body,
            headers
        });

        // Parse response based on invocation type
        let result: unknown;
        let logs: string | undefined;

        if (params.invocationType === "Event") {
            // Async invocation returns 202 with no body
            result = {
                message: "Function invoked asynchronously",
                statusCode: 202
            };
        } else if (params.invocationType === "DryRun") {
            // Dry run returns 204 with no body
            result = {
                message: "Function validation successful",
                statusCode: 204
            };
        } else {
            // RequestResponse returns function result
            result = typeof response === "string" ? JSON.parse(response) : response;

            // Extract logs if available (from X-Amz-Log-Result header)
            if (params.logType === "Tail" && typeof response === "object" && response !== null) {
                const responseObj = response as { headers?: Headers };
                const logResult = responseObj.headers?.get?.("x-amz-log-result");
                if (logResult) {
                    logs = Buffer.from(logResult, "base64").toString("utf-8");
                }
            }
        }

        return {
            success: true,
            data: {
                functionName: params.functionName,
                invocationType: params.invocationType,
                result,
                logs,
                invokedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to invoke Lambda function",
                retryable: false
            }
        };
    }
}
