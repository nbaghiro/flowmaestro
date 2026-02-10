import { z } from "zod";
import { LambdaFunctionNameSchema, LambdaRuntimeSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Create Function operation schema
 */
export const createFunctionSchema = z.object({
    functionName: LambdaFunctionNameSchema,
    runtime: LambdaRuntimeSchema,
    role: z.string().describe("ARN of the IAM role for the function"),
    handler: z.string().describe("Handler method (e.g., index.handler)"),
    code: z
        .object({
            s3Bucket: z.string().optional(),
            s3Key: z.string().optional(),
            s3ObjectVersion: z.string().optional(),
            zipFile: z.string().optional(),
            imageUri: z.string().optional()
        })
        .describe("Function code source"),
    description: z.string().optional().describe("Function description"),
    timeout: z.number().int().min(1).max(900).default(3).describe("Timeout in seconds (1-900)"),
    memorySize: z
        .number()
        .int()
        .min(128)
        .max(10240)
        .default(128)
        .describe("Memory in MB (128-10240)"),
    environment: z.record(z.string()).optional().describe("Environment variables"),
    layers: z.array(z.string()).optional().describe("Lambda layer ARNs"),
    publish: z.boolean().default(false).describe("Publish the first version")
});

export type CreateFunctionParams = z.infer<typeof createFunctionSchema>;

/**
 * Create Function operation definition
 */
export const createFunctionOperation: OperationDefinition = {
    id: "lambda_createFunction",
    name: "Create Lambda Function",
    description: "Create a new Lambda function with specified configuration",
    category: "lambda",
    inputSchema: createFunctionSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute create function operation
 */
export async function executeCreateFunction(
    client: AWSClient,
    params: CreateFunctionParams
): Promise<OperationResult> {
    try {
        // Validate that at least one code source is provided
        const { code } = params;
        if (!code.s3Bucket && !code.zipFile && !code.imageUri) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "One of s3Bucket/s3Key, zipFile, or imageUri must be provided in code",
                    retryable: false
                }
            };
        }

        const requestBody: Record<string, unknown> = {
            FunctionName: params.functionName,
            Runtime: params.runtime,
            Role: params.role,
            Handler: params.handler,
            Code: {},
            Timeout: params.timeout,
            MemorySize: params.memorySize,
            Publish: params.publish
        };

        // Set code source
        if (code.s3Bucket) {
            requestBody.Code = {
                S3Bucket: code.s3Bucket,
                S3Key: code.s3Key,
                S3ObjectVersion: code.s3ObjectVersion
            };
        } else if (code.zipFile) {
            requestBody.Code = {
                ZipFile: code.zipFile
            };
        } else if (code.imageUri) {
            requestBody.Code = {
                ImageUri: code.imageUri
            };
        }

        if (params.description) {
            requestBody.Description = params.description;
        }

        if (params.environment && Object.keys(params.environment).length > 0) {
            requestBody.Environment = {
                Variables: params.environment
            };
        }

        if (params.layers && params.layers.length > 0) {
            requestBody.Layers = params.layers;
        }

        const response = await client.lambda.post<{
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
            state: string;
        }>("/2015-03-31/functions", requestBody);

        return {
            success: true,
            data: {
                functionName: response.functionName,
                functionArn: response.functionArn,
                runtime: response.runtime,
                handler: response.handler,
                role: response.role,
                description: response.description,
                memorySize: response.memorySize,
                timeout: response.timeout,
                lastModified: response.lastModified,
                codeSize: response.codeSize,
                codeSha256: response.codeSha256,
                version: response.version,
                state: response.state,
                createdAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create Lambda function",
                retryable: false
            }
        };
    }
}
