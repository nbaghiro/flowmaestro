import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Who's Out operation schema
 */
export const getWhosOutSchema = z.object({
    start: z.string().optional().describe("Start date filter in ISO 8601 format (YYYY-MM-DD)"),
    end: z.string().optional().describe("End date filter in ISO 8601 format (YYYY-MM-DD)")
});

export type GetWhosOutParams = z.infer<typeof getWhosOutSchema>;

/**
 * Get Who's Out operation definition
 */
export const getWhosOutOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getWhosOut",
            name: "Get Who's Out",
            description: "Get a list of employees who are out of office in BambooHR",
            category: "hr",
            actionType: "read",
            inputSchema: getWhosOutSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "BambooHR", err: error }, "Failed to create getWhosOutOperation");
        throw new Error(
            `Failed to create getWhosOut operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get who's out operation
 */
export async function executeGetWhosOut(
    client: BambooHRClient,
    params: GetWhosOutParams
): Promise<OperationResult> {
    try {
        const response = await client.getWhosOut({
            start: params.start,
            end: params.end
        });

        return {
            success: true,
            data: {
                entries: response.data.map((entry) => ({
                    id: entry.id,
                    type: entry.type,
                    employeeId: entry.employeeId,
                    employeeName: entry.employeeName,
                    name: entry.name,
                    start: entry.start,
                    end: entry.end
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get who's out",
                retryable: true
            }
        };
    }
}
