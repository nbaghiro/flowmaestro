import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Time Off Requests operation schema
 */
export const listTimeOffRequestsSchema = z.object({
    associateOID: z.string().describe("The ADP associate OID of the worker"),
    startDate: z.string().optional().describe("Filter by start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Filter by end date (YYYY-MM-DD)")
});

export type ListTimeOffRequestsParams = z.infer<typeof listTimeOffRequestsSchema>;

/**
 * List Time Off Requests operation definition
 */
export const listTimeOffRequestsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTimeOffRequests",
            name: "List Time Off Requests",
            description: "List time off requests for a specific worker in ADP",
            category: "hr",
            actionType: "read",
            inputSchema: listTimeOffRequestsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ADP", err: error },
            "Failed to create listTimeOffRequestsOperation"
        );
        throw new Error(
            `Failed to create listTimeOffRequests operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list time off requests operation
 */
export async function executeListTimeOffRequests(
    client: ADPClient,
    params: ListTimeOffRequestsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTimeOffRequests(params.associateOID, {
            startDate: params.startDate,
            endDate: params.endDate
        });

        const requests = response.timeOffRequests || [];

        return {
            success: true,
            data: {
                timeOffRequests: requests.map((req) => ({
                    id: req.timeOffRequestID,
                    workerAssociateOID: req.workerAssociateOID,
                    policyCode: req.timeOffPolicyCode?.codeValue,
                    policyName: req.timeOffPolicyCode?.shortName,
                    startDate: req.requestedTimeOff?.startDate,
                    endDate: req.requestedTimeOff?.endDate,
                    quantity: req.requestedTimeOff?.quantity,
                    unit: req.requestedTimeOff?.unitCode,
                    status: req.requestStatus?.codeValue,
                    submittedAt: req.requestSubmissionDateTime,
                    comments: req.comments
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list time off requests",
                retryable: true
            }
        };
    }
}
