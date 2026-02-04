import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createSalesOrderSchema = z.object({
    SalesOrderType: z.string().describe("Sales order type (e.g., 'OR' for standard order)"),
    SalesOrganization: z.string().describe("Sales organization code"),
    DistributionChannel: z.string().describe("Distribution channel code"),
    OrganizationDivision: z.string().describe("Division code"),
    SoldToParty: z.string().describe("Sold-to party business partner ID"),
    PurchaseOrderByCustomer: z.string().optional().describe("Customer purchase order number"),
    SalesOrderDate: z.string().optional().describe("Sales order date (YYYY-MM-DD)"),
    TransactionCurrency: z.string().optional().describe("Currency code (e.g., 'EUR', 'USD')")
});

export type CreateSalesOrderParams = z.infer<typeof createSalesOrderSchema>;

export const createSalesOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createSalesOrder",
            name: "Create Sales Order",
            description: "Create a new sales order in SAP S/4HANA",
            category: "erp",
            actionType: "write",
            inputSchema: createSalesOrderSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create createSalesOrderOperation"
        );
        throw new Error(
            `Failed to create createSalesOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateSalesOrder(
    client: SapClient,
    params: CreateSalesOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.createSalesOrder(params);

        return {
            success: true,
            data: response.d
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create sales order",
                retryable: false
            }
        };
    }
}
