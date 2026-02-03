import { z } from "zod";
import { LambdaFunctionNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Delete Function operation schema
 */
export const deleteFunctionSchema = z.object({
    functionName: LambdaFunctionNameSchema
});

export type DeleteFunctionParams = z.infer<typeof deleteFunctionSchema>;

/**
 * Delete Function operation definition
 */
export const deleteFunctionOperation: OperationDefinition = {
    id: "lambda_deleteFunction",
    name: "Delete Lambda Function",
    description: "Delete a Lambda function and all its versions",
    category: "lambda",
    inputSchema: deleteFunctionSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete function operation
 */
export async function executeDeleteFunction(
    client: AWSClient,
    params: DeleteFunctionParams
): Promise<OperationResult> {
    try {
        // Delete returns 204 No Content on success
        await client.lambda.delete(
            `/2015-03-31/functions/${encodeURIComponent(params.functionName)}`
        );

        return {
            success: true,
            data: {
                functionName: params.functionName,
                message: "Function deleted successfully",
                deletedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to delete Lambda function",
                retryable: false
            }
        };
    }
}
