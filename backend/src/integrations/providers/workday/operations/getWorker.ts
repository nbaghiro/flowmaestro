import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WorkdayClient } from "../client/WorkdayClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Worker operation schema
 */
export const getWorkerSchema = z.object({
    workerId: z.string().min(1).describe("The unique identifier of the worker")
});

export type GetWorkerParams = z.infer<typeof getWorkerSchema>;

/**
 * Get Worker operation definition
 */
export const getWorkerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getWorker",
            name: "Get Worker",
            description:
                "Get detailed worker information including job profile, compensation, and organization",
            category: "hr",
            actionType: "read",
            inputSchema: getWorkerSchema,
            inputSchemaJSON: toJSONSchema(getWorkerSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Workday", err: error }, "Failed to create getWorkerOperation");
        throw new Error(
            `Failed to create getWorker operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get worker operation
 */
export async function executeGetWorker(
    client: WorkdayClient,
    params: GetWorkerParams
): Promise<OperationResult> {
    try {
        const response = await client.getWorker(params.workerId);
        const worker = response.data;

        return {
            success: true,
            data: {
                id: worker.id,
                workerId: worker.workerId,
                firstName: worker.firstName,
                lastName: worker.lastName,
                fullName: worker.fullName,
                email: worker.email,
                businessTitle: worker.businessTitle,
                department: worker.department,
                supervisorId: worker.supervisorId,
                supervisorName: worker.supervisorName,
                hireDate: worker.hireDate,
                terminationDate: worker.terminationDate,
                workerType: worker.workerType,
                location: worker.location,
                employeeStatus: worker.employeeStatus,
                managementLevel: worker.managementLevel,
                timeType: worker.timeType,
                payType: worker.payType,
                jobProfile: worker.jobProfile
                    ? {
                          id: worker.jobProfile.id,
                          name: worker.jobProfile.name,
                          jobFamily: worker.jobProfile.jobFamily,
                          jobFamilyGroup: worker.jobProfile.jobFamilyGroup,
                          jobCategory: worker.jobProfile.jobCategory,
                          managementLevel: worker.jobProfile.managementLevel
                      }
                    : null,
                compensation: worker.compensation
                    ? {
                          basePay: worker.compensation.basePay,
                          currency: worker.compensation.currency,
                          frequency: worker.compensation.frequency,
                          effectiveDate: worker.compensation.effectiveDate
                      }
                    : null,
                organization: {
                    id: worker.organization.id,
                    name: worker.organization.name,
                    type: worker.organization.type,
                    parentId: worker.organization.parentId
                },
                customFields: worker.customFields
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get worker",
                retryable: true
            }
        };
    }
}
