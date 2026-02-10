import { z } from "zod";
import { LambdaFunctionNameSchema, MaxResultsSchema, PaginationMarkerSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * List Function Versions operation schema
 */
export const listFunctionVersionsSchema = z.object({
    functionName: LambdaFunctionNameSchema,
    maxResults: MaxResultsSchema.optional(),
    marker: PaginationMarkerSchema
});

export type ListFunctionVersionsParams = z.infer<typeof listFunctionVersionsSchema>;

/**
 * List Function Versions operation definition
 */
export const listFunctionVersionsOperation: OperationDefinition = {
    id: "lambda_listFunctionVersions",
    name: "List Lambda Function Versions",
    description: "List all versions of a Lambda function",
    category: "lambda",
    inputSchema: listFunctionVersionsSchema,
    retryable: true,
    timeout: 30000
};

interface FunctionVersion {
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
    revisionId?: string;
}

/**
 * Execute list function versions operation
 */
export async function executeListFunctionVersions(
    client: AWSClient,
    params: ListFunctionVersionsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.maxResults) {
            queryParams.MaxItems = params.maxResults.toString();
        }

        if (params.marker) {
            queryParams.Marker = params.marker;
        }

        const response = await client.lambda.get<{
            versions: FunctionVersion[];
            nextMarker?: string;
        }>(
            `/2015-03-31/functions/${encodeURIComponent(params.functionName)}/versions`,
            queryParams
        );

        return {
            success: true,
            data: {
                functionName: params.functionName,
                versions: response.versions.map((version) => ({
                    version: version.version,
                    functionArn: version.functionArn,
                    runtime: version.runtime,
                    handler: version.handler,
                    description: version.description,
                    memorySize: version.memorySize,
                    timeout: version.timeout,
                    lastModified: version.lastModified,
                    codeSize: version.codeSize,
                    codeSha256: version.codeSha256,
                    revisionId: version.revisionId
                })),
                nextMarker: response.nextMarker,
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
                        : "Failed to list Lambda function versions",
                retryable: true
            }
        };
    }
}
