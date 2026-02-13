import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Time Off Request operation schema
 */
export const createTimeOffRequestSchema = z.object({
    personId: z.string().min(1).describe("The unique identifier of the person requesting time off"),
    type: z.string().min(1).describe("The type of time off (e.g., 'pto', 'sick', 'unpaid')"),
    startDate: z.string().min(1).describe("Start date of time off (ISO 8601 format: YYYY-MM-DD)"),
    endDate: z.string().min(1).describe("End date of time off (ISO 8601 format: YYYY-MM-DD)"),
    reason: z.string().optional().describe("Optional reason for the time off request")
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
            description: "Create a new time off request for a worker",
            category: "hr",
            actionType: "write",
            inputSchema: createTimeOffRequestSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Deel", err: error },
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
    client: DeelClient,
    params: CreateTimeOffRequestParams
): Promise<OperationResult> {
    try {
        const response = await client.createTimeOffRequest({
            person_id: params.personId,
            type: params.type,
            start_date: params.startDate,
            end_date: params.endDate,
            reason: params.reason
        });

        const request = response.data;

        return {
            success: true,
            data: {
                id: request.id,
                personId: request.person_id,
                personName: request.person_name,
                type: request.type,
                typeName: request.type_name,
                startDate: request.start_date,
                endDate: request.end_date,
                totalDays: request.total_days,
                status: request.status,
                reason: request.reason,
                createdAt: request.created_at
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
