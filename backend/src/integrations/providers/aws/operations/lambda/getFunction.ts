import { z } from "zod";
import { LambdaFunctionNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Get Function operation schema
 */
export const getFunctionSchema = z.object({
    functionName: LambdaFunctionNameSchema
});

export type GetFunctionParams = z.infer<typeof getFunctionSchema>;

/**
 * Get Function operation definition
 */
export const getFunctionOperation: OperationDefinition = {
    id: "lambda_getFunction",
    name: "Get Lambda Function",
    description: "Get Lambda function configuration and metadata",
    category: "lambda",
    inputSchema: getFunctionSchema,
    retryable: true,
    timeout: 30000
};

interface FunctionConfiguration {
    functionName: string;
    functionArn: string;
    runtime: string;
    role: string;
    handler: string;
    codeSize: number;
    description?: string;
    timeout: number;
    memorySize: number;
    lastModified: string;
    codeSha256: string;
    version: string;
    environment?: {
        variables: Record<string, string>;
    };
    layers?: Array<{
        arn: string;
        codeSize: number;
    }>;
    state?: string;
    stateReason?: string;
    lastUpdateStatus?: string;
}

interface GetFunctionResponse {
    configuration: FunctionConfiguration;
    code: {
        repositoryType: string;
        location: string;
    };
}

/**
 * Execute get function operation
 */
export async function executeGetFunction(
    client: AWSClient,
    params: GetFunctionParams
): Promise<OperationResult> {
    try {
        const response = await client.lambda.get<GetFunctionResponse>(
            `/2015-03-31/functions/${encodeURIComponent(params.functionName)}`
        );

        const config = response.configuration;

        return {
            success: true,
            data: {
                functionName: config.functionName,
                functionArn: config.functionArn,
                runtime: config.runtime,
                handler: config.handler,
                role: config.role,
                description: config.description,
                memorySize: config.memorySize,
                timeout: config.timeout,
                lastModified: config.lastModified,
                codeSize: config.codeSize,
                codeSha256: config.codeSha256,
                version: config.version,
                environment: config.environment,
                layers: config.layers,
                state: config.state,
                stateReason: config.stateReason,
                lastUpdateStatus: config.lastUpdateStatus,
                codeLocation: response.code.location,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Lambda function",
                retryable: true
            }
        };
    }
}
