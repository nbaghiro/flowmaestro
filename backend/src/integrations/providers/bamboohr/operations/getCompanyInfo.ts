import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Company Info operation schema
 */
export const getCompanyInfoSchema = z.object({});

export type GetCompanyInfoParams = z.infer<typeof getCompanyInfoSchema>;

/**
 * Get Company Info operation definition
 */
export const getCompanyInfoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCompanyInfo",
            name: "Get Company Info",
            description: "Get company information from BambooHR",
            category: "hr",
            actionType: "read",
            inputSchema: getCompanyInfoSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
            "Failed to create getCompanyInfoOperation"
        );
        throw new Error(
            `Failed to create getCompanyInfo operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get company info operation
 */
export async function executeGetCompanyInfo(
    client: BambooHRClient,
    _params: GetCompanyInfoParams
): Promise<OperationResult> {
    try {
        const response = await client.getCompanyInfo();
        const company = response.data;

        return {
            success: true,
            data: {
                name: company.name,
                employees: company.employees,
                paidTimeOffAllowed: company.paidTimeOffAllowed,
                timezone: company.timezone
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get company info",
                retryable: true
            }
        };
    }
}
