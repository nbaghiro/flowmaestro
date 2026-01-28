import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WorkdayClient } from "../client/WorkdayClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Request Time Off operation schema
 */
export const requestTimeOffSchema = z.object({
    workerId: z.string().min(1).describe("The ID of the worker requesting time off"),
    startDate: z
        .string()
        .min(1)
        .describe("Start date of the time off (ISO 8601 format, e.g., 2024-01-15)"),
    endDate: z
        .string()
        .min(1)
        .describe("End date of the time off (ISO 8601 format, e.g., 2024-01-19)"),
    absenceType: z.string().min(1).describe("The absence type ID (e.g., vacation, sick leave)"),
    comment: z.string().optional().describe("Optional comment or reason for the time off request")
});

export type RequestTimeOffParams = z.infer<typeof requestTimeOffSchema>;

/**
 * Request Time Off operation definition
 */
export const requestTimeOffOperation: OperationDefinition = (() => {
    try {
        return {
            id: "requestTimeOff",
            name: "Request Time Off",
            description: "Submit a time-off request for a worker in Workday",
            category: "hr",
            actionType: "write",
            inputSchema: requestTimeOffSchema,
            inputSchemaJSON: toJSONSchema(requestTimeOffSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Workday", err: error },
            "Failed to create requestTimeOffOperation"
        );
        throw new Error(
            `Failed to create requestTimeOff operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute request time off operation
 */
export async function executeRequestTimeOff(
    client: WorkdayClient,
    params: RequestTimeOffParams
): Promise<OperationResult> {
    try {
        const response = await client.requestTimeOff({
            workerId: params.workerId,
            absenceTypeId: params.absenceType,
            startDate: params.startDate,
            endDate: params.endDate,
            comment: params.comment
        });

        const request = response.data;

        return {
            success: true,
            data: {
                id: request.id,
                workerId: request.workerId,
                workerName: request.workerName,
                absenceTypeId: request.absenceTypeId,
                absenceTypeName: request.absenceTypeName,
                startDate: request.startDate,
                endDate: request.endDate,
                totalDays: request.totalDays,
                status: request.status,
                comment: request.comment,
                approverName: request.approverName,
                createdAt: request.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to request time off",
                retryable: false
            }
        };
    }
}
