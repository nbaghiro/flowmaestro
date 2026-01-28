import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WorkdayClient } from "../client/WorkdayClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Eligible Absence Types operation schema
 */
export const getEligibleAbsenceTypesSchema = z.object({
    workerId: z.string().min(1).describe("The ID of the worker to get eligible absence types for")
});

export type GetEligibleAbsenceTypesParams = z.infer<typeof getEligibleAbsenceTypesSchema>;

/**
 * Get Eligible Absence Types operation definition
 */
export const getEligibleAbsenceTypesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEligibleAbsenceTypes",
            name: "Get Eligible Absence Types",
            description: "Get the available absence types that a worker is eligible to request",
            category: "hr",
            actionType: "read",
            inputSchema: getEligibleAbsenceTypesSchema,
            inputSchemaJSON: toJSONSchema(getEligibleAbsenceTypesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Workday", err: error },
            "Failed to create getEligibleAbsenceTypesOperation"
        );
        throw new Error(
            `Failed to create getEligibleAbsenceTypes operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get eligible absence types operation
 */
export async function executeGetEligibleAbsenceTypes(
    client: WorkdayClient,
    params: GetEligibleAbsenceTypesParams
): Promise<OperationResult> {
    try {
        const response = await client.getEligibleAbsenceTypes(params.workerId);

        return {
            success: true,
            data: {
                absenceTypes: response.data.map((absenceType) => ({
                    id: absenceType.id,
                    name: absenceType.name,
                    description: absenceType.description,
                    category: absenceType.category,
                    unit: absenceType.unit,
                    minDuration: absenceType.minDuration,
                    maxDuration: absenceType.maxDuration,
                    requiresApproval: absenceType.requiresApproval
                })),
                pagination: {
                    total: response.total,
                    offset: response.offset,
                    limit: response.limit
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get eligible absence types",
                retryable: true
            }
        };
    }
}
