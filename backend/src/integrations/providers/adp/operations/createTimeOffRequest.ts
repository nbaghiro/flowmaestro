import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Time Off Request operation schema
 */
export const createTimeOffRequestSchema = z.object({
    associateOID: z.string().describe("The ADP associate OID of the worker"),
    policyCode: z.string().describe("The time off policy code"),
    startDate: z.string().describe("Start date of the time off (YYYY-MM-DD)"),
    endDate: z.string().describe("End date of the time off (YYYY-MM-DD)"),
    comments: z.string().optional().describe("Optional comments for the request")
});

export type CreateTimeOffRequestParams = z.infer<typeof createTimeOffRequestSchema>;

/**
 * Create Time Off Request operation definition
 */
export const createTimeOffRequestOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createTimeOffRequest",
            name: "Create Time Off Request",
            description: "Create a new time off request for a worker in ADP",
            category: "hr",
            actionType: "write",
            inputSchema: createTimeOffRequestSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ADP", err: error },
            "Failed to create createTimeOffRequestOperation"
        );
        throw new Error(
            `Failed to create createTimeOffRequest operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create time off request operation
 */
export async function executeCreateTimeOffRequest(
    client: ADPClient,
    params: CreateTimeOffRequestParams
): Promise<OperationResult> {
    try {
        const response = await client.createTimeOffRequest(params.associateOID, {
            policyCode: params.policyCode,
            startDate: params.startDate,
            endDate: params.endDate,
            comments: params.comments
        });

        const request = response.timeOffRequests?.[0];

        return {
            success: true,
            data: {
                id: request?.timeOffRequestID,
                workerAssociateOID: request?.workerAssociateOID,
                policyCode: request?.timeOffPolicyCode?.codeValue,
                policyName: request?.timeOffPolicyCode?.shortName,
                startDate: request?.requestedTimeOff?.startDate,
                endDate: request?.requestedTimeOff?.endDate,
                quantity: request?.requestedTimeOff?.quantity,
                unit: request?.requestedTimeOff?.unitCode,
                status: request?.requestStatus?.codeValue,
                submittedAt: request?.requestSubmissionDateTime,
                comments: request?.comments
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create time off request",
                retryable: false
            }
        };
    }
}
