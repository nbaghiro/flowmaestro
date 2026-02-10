import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Benefits operation schema
 */
export const listBenefitsSchema = z.object({});

export type ListBenefitsParams = z.infer<typeof listBenefitsSchema>;

/**
 * List Benefits operation definition
 */
export const listBenefitsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listBenefits",
            name: "List Benefits",
            description: "List all supported benefit types in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: listBenefitsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Gusto", err: error }, "Failed to create listBenefitsOperation");
        throw new Error(
            `Failed to create listBenefits operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list benefits operation
 */
export async function executeListBenefits(
    client: GustoClient,
    _params: ListBenefitsParams
): Promise<OperationResult> {
    try {
        const benefits = await client.listBenefits();

        return {
            success: true,
            data: {
                benefits: benefits.map((benefit) => ({
                    uuid: benefit.uuid,
                    name: benefit.name,
                    description: benefit.description,
                    benefitType: benefit.benefit_type,
                    responsibleForEmployerTaxes: benefit.responsible_for_employer_taxes,
                    responsibleForEmployeeW2: benefit.responsible_for_employee_w2
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list benefits",
                retryable: true
            }
        };
    }
}
