import { z } from "zod";
import { LambdaFunctionNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Update Function Code operation schema
 */
export const updateFunctionCodeSchema = z.object({
    functionName: LambdaFunctionNameSchema,
    s3Bucket: z.string().optional().describe("S3 bucket containing the function code"),
    s3Key: z.string().optional().describe("S3 object key of the function code"),
    s3ObjectVersion: z.string().optional().describe("S3 object version"),
    zipFile: z.string().optional().describe("Base64-encoded zip file content"),
    imageUri: z.string().optional().describe("ECR image URI for container-based functions"),
    publish: z.boolean().default(false).describe("Publish a new version after update"),
    dryRun: z.boolean().default(false).describe("Validate without making changes")
});

export type UpdateFunctionCodeParams = z.infer<typeof updateFunctionCodeSchema>;

/**
 * Update Function Code operation definition
 */
export const updateFunctionCodeOperation: OperationDefinition = {
    id: "lambda_updateFunctionCode",
    name: "Update Lambda Function Code",
    description: "Update Lambda function code from S3, zip file, or container image",
    category: "lambda",
    inputSchema: updateFunctionCodeSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute update function code operation
 */
export async function executeUpdateFunctionCode(
    client: AWSClient,
    params: UpdateFunctionCodeParams
): Promise<OperationResult> {
    try {
        // Validate that at least one code source is provided
        if (!params.s3Bucket && !params.zipFile && !params.imageUri) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "One of s3Bucket/s3Key, zipFile, or imageUri must be provided",
                    retryable: false
                }
            };
        }

        const body: Record<string, unknown> = {
            Publish: params.publish,
            DryRun: params.dryRun
        };

        if (params.s3Bucket) {
            body.S3Bucket = params.s3Bucket;
            body.S3Key = params.s3Key;
            if (params.s3ObjectVersion) {
                body.S3ObjectVersion = params.s3ObjectVersion;
            }
        } else if (params.zipFile) {
            body.ZipFile = params.zipFile;
        } else if (params.imageUri) {
            body.ImageUri = params.imageUri;
        }

        const response = await client.lambda.put(
            `/2015-03-31/functions/${encodeURIComponent(params.functionName)}/code`,
            body
        );

        return {
            success: true,
            data: {
                functionName: params.functionName,
                functionArn: (response as { functionArn?: string }).functionArn,
                codeSha256: (response as { codeSha256?: string }).codeSha256,
                codeSize: (response as { codeSize?: number }).codeSize,
                lastModified: (response as { lastModified?: string }).lastModified,
                version: (response as { version?: string }).version,
                updatedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to update Lambda function code",
                retryable: false
            }
        };
    }
}
