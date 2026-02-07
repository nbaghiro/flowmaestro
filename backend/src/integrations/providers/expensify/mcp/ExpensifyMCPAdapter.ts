import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ExpensifyClient } from "../client/ExpensifyClient";
// Report operations
import { executeManageEmployees } from "../operations/employees/manageEmployees";
import { executeCreateExpense } from "../operations/expenses/createExpense";
import { executeListPolicies } from "../operations/policies/listPolicies";
import { executeUpdatePolicy } from "../operations/policies/updatePolicy";
import { executeExportReports } from "../operations/reports/exportReports";
import { executeGetReport } from "../operations/reports/getReport";
// Expense operations
// Policy operations
// Employee operations
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Expensify MCP Adapter - wraps operations as MCP tools
 */
export class ExpensifyMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `expensify_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: ExpensifyClient
    ): Promise<unknown> {
        // Remove "expensify_" prefix to get operation ID
        const operationId = toolName.replace(/^expensify_/, "");

        // Route to operation executor
        switch (operationId) {
            // Report operations
            case "exportReports":
                return await executeExportReports(client, params as never);
            case "getReport":
                return await executeGetReport(client, params as never);
            // Expense operations
            case "createExpense":
                return await executeCreateExpense(client, params as never);
            // Policy operations
            case "listPolicies":
                return await executeListPolicies(client, params as never);
            case "updatePolicy":
                return await executeUpdatePolicy(client, params as never);
            // Employee operations
            case "manageEmployees":
                return await executeManageEmployees(client, params as never);
            default:
                throw new Error(`Unknown Expensify operation: ${operationId}`);
        }
    }
}
