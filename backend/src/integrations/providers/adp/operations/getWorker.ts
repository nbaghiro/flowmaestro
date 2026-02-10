import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Worker operation schema
 */
export const getWorkerSchema = z.object({
    associateOID: z.string().describe("The ADP associate OID of the worker to retrieve")
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
            description: "Get detailed information about a specific worker by their associate OID",
            category: "hr",
            actionType: "read",
            inputSchema: getWorkerSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "ADP", err: error }, "Failed to create getWorkerOperation");
        throw new Error(
            `Failed to create getWorker operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get worker operation
 */
export async function executeGetWorker(
    client: ADPClient,
    params: GetWorkerParams
): Promise<OperationResult> {
    try {
        const response = await client.getWorker(params.associateOID);

        const worker = response.workers?.[0];
        if (!worker) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Worker not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                associateOID: worker.associateOID,
                workerId: worker.workerID?.idValue,
                name: worker.person?.legalName?.formattedName,
                firstName: worker.person?.legalName?.givenName,
                lastName: worker.person?.legalName?.familyName1,
                workEmail: worker.businessCommunication?.emails?.[0]?.emailUri || null,
                personalEmail: worker.person?.communication?.emails?.[0]?.emailUri || null,
                phone: worker.person?.communication?.phones?.[0]?.dialNumber || null,
                status: worker.workerStatus?.statusCode?.codeValue,
                hireDate: worker.workerDates?.originalHireDate,
                terminationDate: worker.workerDates?.terminationDate,
                positionTitle: worker.workAssignments?.[0]?.positionTitle || null,
                department:
                    worker.workAssignments?.[0]?.homeOrganizationalUnits?.find(
                        (u) => u.typeCode?.codeValue === "Department"
                    )?.nameCode?.shortName || null,
                workLocation:
                    worker.workAssignments?.[0]?.homeWorkLocation?.nameCode?.shortName || null,
                reportsTo:
                    worker.workAssignments?.[0]?.reportsTo?.[0]?.workerName?.formattedName || null,
                workAssignments: worker.workAssignments?.map((wa) => ({
                    positionTitle: wa.positionTitle,
                    status: wa.assignmentStatus?.statusCode?.codeValue,
                    departments: wa.homeOrganizationalUnits?.map((u) => ({
                        code: u.nameCode?.codeValue,
                        name: u.nameCode?.shortName,
                        type: u.typeCode?.shortName
                    })),
                    location: wa.homeWorkLocation?.nameCode?.shortName || null,
                    reportsTo: wa.reportsTo?.map((r) => ({
                        associateOID: r.associateOID,
                        name: r.workerName?.formattedName
                    }))
                }))
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
