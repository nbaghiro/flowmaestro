import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Workers operation schema
 */
export const listWorkersSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListWorkersParams = z.infer<typeof listWorkersSchema>;

/**
 * List Workers operation definition
 */
export const listWorkersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listWorkers",
            name: "List Workers",
            description: "List all workers in ADP with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listWorkersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "ADP", err: error }, "Failed to create listWorkersOperation");
        throw new Error(
            `Failed to create listWorkers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list workers operation
 */
export async function executeListWorkers(
    client: ADPClient,
    params: ListWorkersParams
): Promise<OperationResult> {
    try {
        const response = await client.listWorkers({
            limit: params.limit,
            offset: params.offset
        });

        const workers = response.workers || [];

        return {
            success: true,
            data: {
                workers: workers.map((worker) => ({
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
                        worker.workAssignments?.[0]?.reportsTo?.[0]?.workerName?.formattedName ||
                        null
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workers",
                retryable: true
            }
        };
    }
}
