import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Time Off Request operation schema
 */
export const createTimeOffRequestSchema = z.object({
    employeeId: z.string().min(1).describe("The employee ID to create the request for"),
    start: z.string().min(1).describe("Start date in ISO 8601 format (YYYY-MM-DD)"),
    end: z.string().min(1).describe("End date in ISO 8601 format (YYYY-MM-DD)"),
    timeOffTypeId: z.string().min(1).describe("ID of the time off type/policy"),
    amount: z.number().min(0).describe("Amount of time off (in days or hours)"),
    notes: z.string().optional().describe("Optional notes for the request"),
    status: z.enum(["requested", "approved"]).optional().describe("Initial status of the request")
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
            description: "Create a new time off request in BambooHR",
            category: "hr",
            actionType: "write",
            inputSchema: createTimeOffRequestSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
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
    client: BambooHRClient,
    params: CreateTimeOffRequestParams
): Promise<OperationResult> {
    try {
        const response = await client.createTimeOffRequest({
            employeeId: params.employeeId,
            start: params.start,
            end: params.end,
            timeOffTypeId: params.timeOffTypeId,
            amount: params.amount,
            notes: params.notes,
            status: params.status
        });

        const req = response.data;

        return {
            success: true,
            data: {
                id: req.id,
                employeeId: req.employeeId,
                employeeName: req.employeeName,
                start: req.start,
                end: req.end,
                type: req.type,
                amount: req.amount,
                status: req.status,
                notes: req.notes,
                created: req.created
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
