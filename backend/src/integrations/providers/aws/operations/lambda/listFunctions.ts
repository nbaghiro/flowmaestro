import { z } from "zod";
import { MaxResultsSchema, PaginationMarkerSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * List Functions operation schema
 */
export const listFunctionsSchema = z.object({
    maxResults: MaxResultsSchema.optional(),
    marker: PaginationMarkerSchema
});

export type ListFunctionsParams = z.infer<typeof listFunctionsSchema>;

/**
 * List Functions operation definition
 */
export const listFunctionsOperation: OperationDefinition = {
    id: "lambda_listFunctions",
    name: "List Lambda Functions",
    description: "List all Lambda functions in the configured region",
    category: "lambda",
    inputSchema: listFunctionsSchema,
    retryable: true,
    timeout: 30000
};

interface LambdaFunction {
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
}

interface ListFunctionsResponse {
    functions: LambdaFunction[];
    nextMarker?: string;
}

/**
 * Execute list functions operation
 */
export async function executeListFunctions(
    client: AWSClient,
    params: ListFunctionsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.maxResults) {
            queryParams.MaxItems = params.maxResults.toString();
        }

        if (params.marker) {
            queryParams.Marker = params.marker;
        }

        const response = await client.lambda.get<ListFunctionsResponse>("/2015-03-31/functions", {
            ...queryParams
        });

        return {
            success: true,
            data: {
                functions: response.functions.map((fn: LambdaFunction) => ({
                    functionName: fn.functionName,
                    functionArn: fn.functionArn,
                    runtime: fn.runtime,
                    handler: fn.handler,
                    description: fn.description,
                    memorySize: fn.memorySize,
                    timeout: fn.timeout,
                    lastModified: fn.lastModified,
                    codeSize: fn.codeSize,
                    version: fn.version
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
                message: error instanceof Error ? error.message : "Failed to list Lambda functions",
                retryable: true
            }
        };
    }
}
